from __future__ import annotations
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.transaction import Transaction
from app.services.exposure_engine import calculate_campaign_exposure


def simulate_campaign_counterfactual(
    campaign: Campaign,
    db: Session,
) -> Dict[str, Any]:
    """
    Campaign Containment Counterfactual Engine (Section 2.5):
    Compares 3 high-level options across the entire campaign cluster:
    1. Status Quo / Allow (No coordinated intervention)
    2. Challenge Campaign (Step-up 2FA/KYC on all cluster entities)
    3. Contain Campaign (Coordinated temporary hold/block)
    
    Dynamically recommends whichever option maximizes Net Expected Value (minimizes expected loss + friction).
    """
    exposure_data = calculate_campaign_exposure(campaign, db)
    high_exposure_paise = exposure_data["exposure_at_risk_high_paise"]
    current_paise = exposure_data["current_observed_paise"]
    txns_count = max(exposure_data["attributed_transactions_count"], 1)

    score = campaign.campaign_score

    # Option 1: Status Quo (Allow / Individual Scoring)
    # Expected fraud loss = high exposure * risk probability
    status_quo_fraud_loss_paise = int(high_exposure_paise * min(score, 0.95))
    status_quo_friction_paise = 0
    status_quo_net_ev_paise = -(status_quo_fraud_loss_paise + status_quo_friction_paise)

    # Option 2: Challenge Campaign
    # 85% effectiveness at stopping fraudulent bots, with modest friction cost
    challenge_fraud_loss_paise = int(status_quo_fraud_loss_paise * (1.0 - 0.85))
    challenge_friction_paise = int(txns_count * 2500)  # ₹25 per challenge friction
    challenge_net_ev_paise = -(challenge_fraud_loss_paise + challenge_friction_paise)

    # Option 3: Contain Campaign
    # 98% fraud prevented, fixed containment administrative overhead
    contain_fraud_loss_paise = int(status_quo_fraud_loss_paise * (1.0 - 0.98))
    contain_friction_paise = int(txns_count * 5000)  # ₹50 per hold disruption
    contain_net_ev_paise = -(contain_fraud_loss_paise + contain_friction_paise)

    # Savings relative to status quo
    savings_challenge_paise = max(challenge_net_ev_paise - status_quo_net_ev_paise, 0)
    savings_contain_paise = max(contain_net_ev_paise - status_quo_net_ev_paise, 0)

    # Dynamically select policy that maximizes Net Expected Value (least negative loss)
    ev_map = {
        "allow": status_quo_net_ev_paise,
        "challenge": challenge_net_ev_paise,
        "contain": contain_net_ev_paise,
    }
    recommended = max(ev_map, key=ev_map.get)

    return {
        "campaign_id": campaign.id,
        "campaign_score": score,
        "recommended_policy": recommended,
        "projected_total_exposure_inr": round(high_exposure_paise / 100.0, 2),
        "options": {
            "status_quo": {
                "action": "allow_individual_scoring",
                "fraud_loss_paise": status_quo_fraud_loss_paise,
                "fraud_loss_inr": round(status_quo_fraud_loss_paise / 100.0, 2),
                "friction_cost_paise": status_quo_friction_paise,
                "friction_cost_inr": round(status_quo_friction_paise / 100.0, 2),
                "net_expected_value_paise": status_quo_net_ev_paise,
                "net_expected_value_inr": round(status_quo_net_ev_paise / 100.0, 2),
            },
            "challenge": {
                "action": "step_up_challenge_cluster",
                "fraud_loss_paise": challenge_fraud_loss_paise,
                "fraud_loss_inr": round(challenge_fraud_loss_paise / 100.0, 2),
                "friction_cost_paise": challenge_friction_paise,
                "friction_cost_inr": round(challenge_friction_paise / 100.0, 2),
                "net_expected_value_paise": challenge_net_ev_paise,
                "net_expected_value_inr": round(challenge_net_ev_paise / 100.0, 2),
                "savings_vs_status_quo_inr": round(savings_challenge_paise / 100.0, 2),
            },
            "contain": {
                "action": "contain_cluster_hold",
                "fraud_loss_paise": contain_fraud_loss_paise,
                "fraud_loss_inr": round(contain_fraud_loss_paise / 100.0, 2),
                "friction_cost_paise": contain_friction_paise,
                "friction_cost_inr": round(contain_friction_paise / 100.0, 2),
                "net_expected_value_paise": contain_net_ev_paise,
                "net_expected_value_inr": round(contain_net_ev_paise / 100.0, 2),
                "savings_vs_status_quo_inr": round(savings_contain_paise / 100.0, 2),
            },
        },
    }