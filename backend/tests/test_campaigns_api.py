import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_campaign_metrics():
    response = client.get("/api/campaigns/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "avg_ttc_seconds" in data
    assert "avg_ttc_minutes" in data
    assert "attack_compression_ratio" in data
    assert "attack_compression_ratio_percentage" in data
    assert "active_exposure_at_risk_inr" in data
    assert "contained_exposure_prevented_inr" in data
    assert data["attack_compression_ratio_percentage"] >= 0.0


def test_get_active_campaigns():
    response = client.get("/api/campaigns/active")
    assert response.status_code == 200
    data = response.json()
    assert "campaigns" in data
    assert "count" in data
    assert data["count"] >= 1
    
    first = data["campaigns"][0]
    assert "id" in first
    assert "status" in first
    assert "campaign_score" in first
    assert "exposure" in first
    assert "recommended_policy" in first


def test_get_campaign_detail_and_containment_and_counterfactual():
    # 1. Fetch active campaigns to get a forming campaign ID
    res = client.get("/api/campaigns/active")
    assert res.status_code == 200
    c_list = res.json()["campaigns"]
    forming_camps = [c for c in c_list if c["status"] == "forming"]
    assert len(forming_camps) > 0
    cid = forming_camps[0]["id"]

    # 2. Get Campaign Detail
    res_detail = client.get(f"/api/campaigns/{cid}")
    assert res_detail.status_code == 200
    d_data = res_detail.json()
    assert d_data["id"] == cid
    assert "timeline_events" in d_data
    assert "exposure" in d_data
    assert "legitimate_event_check" in d_data

    # 3. Campaign Counterfactual Simulation
    res_cf = client.post(f"/api/campaigns/{cid}/counterfactual")
    assert res_cf.status_code == 200
    cf_data = res_cf.json()
    assert "options" in cf_data
    assert "status_quo" in cf_data["options"]
    assert "challenge" in cf_data["options"]
    assert "contain" in cf_data["options"]
    assert cf_data["options"]["contain"]["fraud_loss_inr"] <= cf_data["options"]["status_quo"]["fraud_loss_inr"]

    # 4. Contain Campaign
    res_contain = client.post(
        f"/api/campaigns/{cid}/contain",
        json={"policy": "contain", "analyst_name": "Lead Analyst", "note": "Verified coordinated botnet."}
    )
    assert res_contain.status_code == 200
    cont_data = res_contain.json()
    assert cont_data["status"] == "contained"
    assert cont_data["contained_at"] is not None
    assert cont_data["transaction_action_applied"] == "block"

    # Verify detail reflects contained status
    res_detail2 = client.get(f"/api/campaigns/{cid}")
    assert res_detail2.json()["status"] == "contained"

def test_contain_policy_severity_alignment_and_cascading():
    from app.database import SessionLocal
    from app.models.transaction import Transaction, TransactionStatus, RiskLabel
    from app.models.customer import Customer
    from app.models.merchant import Merchant
    from app.models.campaign import Campaign, CampaignStatus, CampaignPolicy
    from datetime import datetime, timezone
    db = SessionLocal()

    m = db.query(Merchant).first()
    cust = db.query(Customer).first()
    camp_id = uuid.uuid4()
    camp = Campaign(
        id=camp_id,
        status=CampaignStatus.forming,
        detected_at=datetime.now(timezone.utc),
        campaign_score=0.85,
        confidence=0.90,
        entity_ids=[{"entity_type": "merchant", "entity_id": str(m.id)}],
        entry_point="Coordinated containment test ring",
        recommended_policy=CampaignPolicy.contain,
    )
    db.add(camp)
    t1 = Transaction(customer_id=cust.id, merchant_id=m.id, amount=50000, currency="INR", campaign_id=camp_id, status=TransactionStatus.pending, risk_label=RiskLabel.verify)
    t2 = Transaction(customer_id=cust.id, merchant_id=m.id, amount=75000, currency="INR", campaign_id=camp_id, status=TransactionStatus.pending, risk_label=RiskLabel.verify)
    db.add_all([t1, t2])
    db.commit()

    res_contain = client.post(
        f"/api/campaigns/{camp_id}/contain",
        json={"policy": "contain", "analyst_name": "SecOps Analyst", "note": "Isolating ring."}
    )
    assert res_contain.status_code == 200
    data = res_contain.json()
    assert data["status"] == "contained"
    assert data["transaction_action_applied"] == "block"

    db.expire_all()
    txns = db.query(Transaction).filter(Transaction.campaign_id == camp_id).all()
    assert len(txns) == 2
    for t in txns:
        assert t.status.value == "declined"
        assert t.risk_label.value == "block"
    db.close()


def test_verify_policy_severity_alignment_and_cascading():
    from app.database import SessionLocal
    from app.models.transaction import Transaction, TransactionStatus, RiskLabel
    from app.models.customer import Customer
    from app.models.merchant import Merchant
    from app.models.campaign import Campaign, CampaignStatus, CampaignPolicy
    from datetime import datetime, timezone
    db = SessionLocal()

    m = db.query(Merchant).first()
    cust = db.query(Customer).first()
    camp_id = uuid.uuid4()
    camp = Campaign(
        id=camp_id,
        status=CampaignStatus.forming,
        detected_at=datetime.now(timezone.utc),
        campaign_score=0.72,
        confidence=0.88,
        entity_ids=[{"entity_type": "merchant", "entity_id": str(m.id)}],
        entry_point="Coordinated verification test ring",
        recommended_policy=CampaignPolicy.challenge,
    )
    db.add(camp)
    t1 = Transaction(customer_id=cust.id, merchant_id=m.id, amount=30000, currency="INR", campaign_id=camp_id, status=TransactionStatus.pending, risk_label=RiskLabel.allow)
    t2 = Transaction(customer_id=cust.id, merchant_id=m.id, amount=40000, currency="INR", campaign_id=camp_id, status=TransactionStatus.pending, risk_label=RiskLabel.allow)
    db.add_all([t1, t2])
    db.commit()

    res_verify = client.post(
        f"/api/campaigns/{camp_id}/verify",
        json={"analyst_name": "Fraud Lead", "note": "Enforcing step-up 2FA on candidate cluster."}
    )
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert data["status"] == "active"
    assert data["transaction_action_applied"] == "verify"

    db.expire_all()
    txns = db.query(Transaction).filter(Transaction.campaign_id == camp_id).all()
    assert len(txns) == 2
    for t in txns:
        assert t.status.value == "pending"
        assert t.risk_label.value == "verify"
    db.close()


def test_live_attack_map_dashboard_endpoint():
    response = client.get("/api/dashboard/live-attack-map")
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert "active_campaigns_count" in data
    assert "campaigns" in data
    assert isinstance(data["campaigns"], list)
    if data["active_campaigns_count"] > 0:
        first = data["campaigns"][0]
        assert "campaign_id" in first
        assert "status" in first
        assert "campaign_score" in first
        assert "exposure_range_inr" in first
        assert "recommended_policy" in first