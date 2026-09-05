import pytest
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus, RiskLabel
from app.models.investigation import Investigation
from app.models.human_review import HumanReview, ReviewDecision, FinalAction
from scripts.seed import seed_database

# Test client
client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database is freshly seeded before test session."""
    seed_database()


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["system"] == "RISKOS"


def test_dashboard_summary():
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_transactions" in data
    assert "high_risk_count" in data
    assert "loss_prevented_inr" in data
    assert "live_activity" in data


def test_risk_scoring_dashboard_consistency():
    """
    Regression Test:
    Ensures that any transaction scored via POST /api/risk/score produces the EXACT
    same numerical risk_score as stored and displayed in GET /api/dashboard/summary,
    preventing any divergence between stored/seeded scores and live inference.
    """
    summary_res = client.get("/api/dashboard/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    live_items = summary.get("live_activity", [])
    assert len(live_items) > 0, "Expected seeded transactions in live activity"

    db = SessionLocal()
    for item in live_items:
        txn_id = item["transaction_id"]
        score_res = client.post("/api/risk/score", json={"transaction_id": txn_id})
        assert score_res.status_code == 200, f"Scoring failed for txn {txn_id}"
        score_data = score_res.json()

        d_score = item["risk_score"]
        d_status = item["status"]
        s_score = score_data["risk_score"]
        s_label = score_data["risk_label"]

        # 1. Exact numerical score consistency (within rounding tolerance)
        assert abs(d_score - s_score) <= 0.01, (
            f"Score inconsistency for txn {txn_id}: "
            f"Dashboard={d_score} vs API Scored={s_score}"
        )

        # 2. Risk label consistency (if not human-overridden)
        inv = db.query(Investigation).filter(Investigation.transaction_id == uuid.UUID(txn_id)).first()
        is_overridden = False
        if inv:
            override = db.query(HumanReview).filter(
                HumanReview.investigation_id == inv.id,
                HumanReview.decision == ReviewDecision.overridden
            ).first()
            if override:
                is_overridden = True

        if not is_overridden:
            assert d_status.lower() == s_label.lower(), (
                f"Label inconsistency for txn {txn_id}: "
                f"Dashboard status='{d_status}' vs API label='{s_label}'"
            )
    db.close()


def test_counterfactual_simulation():
    """
    Test Counterfactual simulation engine for mathematical consistency
    and proper recommendation selection.
    """
    summary_res = client.get("/api/dashboard/summary")
    live_items = summary_res.json().get("live_activity", [])
    txn_id = live_items[0]["transaction_id"]

    res = client.post("/api/counterfactual", json={"transaction_id": txn_id})
    assert res.status_code == 200
    data = res.json()
    assert data["transaction_id"] == txn_id
    assert len(data["options"]) == 4
    
    actions = [o["action"] for o in data["options"]]
    assert set(actions) == {"allow", "verify", "hold", "block"}
    assert any(o["recommended"] is True for o in data["options"])
    assert data["recommended_action"] in actions

    # Verify mathematical auditability: NEV = -(Loss + Friction)
    for opt in data["options"]:
        expected_nev = -(opt["estimated_fraud_loss_paise"] + opt["friction_cost_paise"])
        assert opt["net_expected_value_paise"] == expected_nev


def test_human_review_status_transitions_and_adaptive_feedback():
    """
    Regression Test:
    1. Tests submitting an analyst hold approval -> status becomes 'held'.
    2. Tests submitting an analyst block approval -> status becomes 'declined'.
    3. Tests submitting an analyst override -> status becomes 'approved'.
    4. Tests that subsequent investigations retrieve the override in adaptive feedback.
    """
    db = SessionLocal()
    c = Customer(name="Override Subject", email=f"override_{uuid.uuid4().hex[:6]}@domain.xyz", trust_score=0.8)
    m = db.query(Merchant).first()
    db.add(c)
    db.commit()

    # Case A: Hold approval transition
    t_hold = Transaction(
        customer_id=c.id, merchant_id=m.id, amount=3000000, currency="INR",
        risk_score=75.0, risk_label=RiskLabel.hold, status=TransactionStatus.pending,
    )
    db.add(t_hold)
    db.commit()
    inv_hold = client.post("/api/investigations", json={"transaction_id": str(t_hold.id)}).json()
    rev_hold = client.post(f"/api/reviews/{inv_hold['id']}", json={
        "reviewer_name": "Senior Analyst Vikram",
        "decision": "approved_ai_recommendation",
        "final_action": "hold",
        "reason": "Hold confirmed.",
    })
    assert rev_hold.status_code == 201
    db.refresh(t_hold)
    assert t_hold.status == TransactionStatus.held

    # Case B: Block approval transition
    t_block = Transaction(
        customer_id=c.id, merchant_id=m.id, amount=9000000, currency="INR",
        risk_score=92.0, risk_label=RiskLabel.block, status=TransactionStatus.pending,
    )
    db.add(t_block)
    db.commit()
    inv_block = client.post("/api/investigations", json={"transaction_id": str(t_block.id)}).json()
    rev_block = client.post(f"/api/reviews/{inv_block['id']}", json={
        "reviewer_name": "Senior Analyst Vikram",
        "decision": "approved_ai_recommendation",
        "final_action": "block",
        "reason": "Critical risk confirmed.",
    })
    assert rev_block.status_code == 201
    db.refresh(t_block)
    assert t_block.status == TransactionStatus.declined

    # Case C: Override allow transition
    t1 = Transaction(
        customer_id=c.id, merchant_id=m.id, amount=5000000, currency="INR",
        risk_score=75.0, risk_label=RiskLabel.hold, status=TransactionStatus.pending,
    )
    db.add(t1)
    db.commit()
    inv1_res = client.post("/api/investigations", json={"transaction_id": str(t1.id)})
    assert inv1_res.status_code == 201
    inv1_id = inv1_res.json()["id"]

    rev_payload = {
        "reviewer_name": "Senior Analyst Vikram",
        "decision": "overridden",
        "final_action": "allow",
        "reason": "Verified user identity and genuine travel transaction.",
    }
    rev_res = client.post(f"/api/reviews/{inv1_id}", json=rev_payload)
    assert rev_res.status_code == 201
    db.refresh(t1)
    assert t1.status == TransactionStatus.approved
    assert t1.risk_label == RiskLabel.allow

    # Case D: Adaptive feedback loop on similar transaction
    t2 = Transaction(
        customer_id=c.id, merchant_id=m.id, amount=6000000, currency="INR",
        risk_score=72.0, risk_label=RiskLabel.hold, status=TransactionStatus.pending,
    )
    db.add(t2)
    db.commit()

    inv2_res = client.post("/api/investigations", json={"transaction_id": str(t2.id)})
    assert inv2_res.status_code == 201
    evidence_items = inv2_res.json()["evidence"]["items"]
    
    feedback_findings = [e for e in evidence_items if e["source"] == "adaptive_feedback_loop"]
    assert len(feedback_findings) > 0
    assert "Adaptive Feedback" in feedback_findings[0]["finding"]
    db.close()


def test_standardized_error_handling_and_validation():
    # 1. 404 Standard Error
    res_404 = client.get(f"/api/transactions/{uuid.uuid4()}")
    assert res_404.status_code == 404
    body_404 = res_404.json()
    assert "error" in body_404
    assert body_404["error"]["code"] == 404
    assert "message" in body_404["error"]

    # 2. 422 Malformed UUID
    res_uuid = client.get("/api/transactions/not-a-uuid")
    assert res_uuid.status_code == 422
    body_uuid = res_uuid.json()
    assert "error" in body_uuid
    assert body_uuid["error"]["code"] == 422

    # 3. 422 Negative Amount Validation
    res_neg = client.post("/api/transactions", json={
        "customer_id": str(uuid.uuid4()),
        "merchant_id": str(uuid.uuid4()),
        "amount": -100,
        "currency": "INR"
    })
    assert res_neg.status_code == 422
    body_neg = res_neg.json()
    assert "error" in body_neg
    assert body_neg["error"]["code"] == 422
    assert any("amount" in str(d["field"]) for d in body_neg["error"]["details"])


def test_pagination():
    # 1. Pending reviews pagination
    rev_res = client.get("/api/reviews/pending?limit=2&offset=0")
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert "items" in rev_data
    assert "total" in rev_data
    assert rev_data["limit"] == 2
    assert rev_data["offset"] == 0
    assert len(rev_data["items"]) <= 2

    # 2. Transactions pagination
    txn_res = client.get("/api/transactions?limit=5&offset=0")
    assert txn_res.status_code == 200
    txn_data = txn_res.json()
    assert "items" in txn_data
    assert "total" in txn_data
    assert txn_data["limit"] == 5
    assert len(txn_data["items"]) <= 5


def test_jwt_auth_flow():
    # 1. Protected route rejects without token
    unauth = client.get("/api/auth/me")
    assert unauth.status_code == 401
    assert "error" in unauth.json()

    # 2. Valid login
    login_res = client.post("/api/auth/login", json={
        "email": "analyst@riskos.ai",
        "password": "analyst_demo_secret_2026"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # 3. Access protected route with Bearer token
    auth_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert auth_res.status_code == 200
    assert auth_res.json()["authenticated"] is True
    assert auth_res.json()["user"]["sub"] == "analyst@riskos.ai"


def test_live_activity_feed():
    feed_res = client.get("/api/dashboard/live?limit=10")
    assert feed_res.status_code == 200
    feed_data = feed_res.json()
    assert "timestamp" in feed_data
    assert "events" in feed_data
    assert len(feed_data["events"]) <= 10


def test_full_riskos_pipeline():
    # 1. Ingest Transaction
    cust_id = str(uuid.uuid4())
    merch_id = str(uuid.uuid4())

    db = SessionLocal()
    c = Customer(id=uuid.UUID(cust_id), name="Test Subject", email=f"test_{cust_id[:8]}@example.com", trust_score=0.9)
    m = Merchant(id=uuid.UUID(merch_id), name="Test Merchant", category="electronics")
    db.add_all([c, m])
    db.commit()
    db.close()

    payload = {
        "customer_id": cust_id,
        "merchant_id": merch_id,
        "amount": 8500000, # 85,000 INR
        "currency": "INR",
        "device_fingerprint": "dev_test_fp_123",
        "ip_address": "192.168.1.100",
        "instrument_hash": "card_test_hash_4444",
        "instrument_type": "card",
    }
    res = client.post("/api/transactions", json=payload)
    assert res.status_code == 201
    txn_data = res.json()
    txn_id = txn_data["id"]
    assert txn_data["amount"] == 8500000
    assert txn_data["amount_inr"] == 85000.0

    # 2. Score Transaction
    score_res = client.post("/api/risk/score", json={"transaction_id": txn_id})
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert "risk_score" in score_data
    assert "risk_label" in score_data
    assert "features" in score_data
    assert "feature_contributions" in score_data

    # 3. Dynamic Decision
    dec_res = client.post("/api/decision", json={"transaction_id": txn_id})
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert "final_action" in dec_data
    assert "risk_band" in dec_data
    assert "reasoning" in dec_data

    # 4. Counterfactual Simulation
    cf_res = client.post("/api/counterfactual", json={"transaction_id": txn_id})
    assert cf_res.status_code == 200
    cf_data = cf_res.json()
    assert len(cf_data["options"]) == 4
    assert any(o["action"] == "allow" for o in cf_data["options"])
    assert any(o["action"] == "block" for o in cf_data["options"])
    assert "recommended_action" in cf_data

    # 5. Spike Velocity Check
    spike_res = client.get(f"/api/spikes/{merch_id}")
    assert spike_res.status_code == 200
    spike_data = spike_res.json()
    assert "current_count" in spike_data
    assert "spike_detected" in spike_data

    # 6. Entity Graph
    graph_res = client.get(f"/api/graph/{cust_id}")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert any(n["id"] == cust_id for n in graph_data["nodes"])

    # 7. AI Investigator
    inv_res = client.post("/api/investigations", json={"transaction_id": txn_id})
    assert inv_res.status_code == 201
    inv_data = inv_res.json()
    assert "evidence" in inv_data
    assert "ai_conclusion" in inv_data
    assert "recommended_action" in inv_data
    inv_id = inv_data["id"]

    # 8. Human Review Submission
    rev_payload = {
        "reviewer_name": "Analyst Priya",
        "decision": "approved_ai_recommendation",
        "final_action": inv_data["recommended_action"] or "hold",
        "reason": "Verified anomalous pattern with high confidence.",
    }
    rev_res = client.post(f"/api/reviews/{inv_id}", json=rev_payload)
    assert rev_res.status_code == 201

    # 9. Chargeback Evidence Pack
    cb_res = client.post(f"/api/chargebacks/{txn_id}/evidence-pack")
    assert cb_res.status_code == 200
    cb_data = cb_res.json()
    assert "evidence_pack" in cb_data
    assert cb_data["evidence_pack"]["transaction"]["id"] == txn_id
    assert "pack_pdf_path" in cb_data

    # 10. Model Health
    health_res = client.get("/api/model/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert "latest" in health_data