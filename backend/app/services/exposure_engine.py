from __future__ import annotations
import uuid
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.campaign import Campaign, CampaignStatus
from app.models.transaction import Transaction


def calculate_campaign_exposure(
    campaign: Campaign,
    db: Session,
) -> Dict[str, Any]:
    """
    Calculates the financial exposure at risk for a campaign cluster per Section 2.4:
    exposure_at_risk = Σ (P_fraud_i × expected_loss_i) for each suspicious entity i in the cluster
    
    where expected_loss_i is anchored to THIS campaign's own observed average transaction value (scale),
    and adjusted by empirical historical throughput ratios (txns-per-entity multiplier from past contained campaigns).
    
    Low and high bounds reflect a realistic confidence range tied directly to the campaign's ticket size.
    """
    # 1. Query attributed transactions for current observed volume and average ticket size
    txns = db.query(Transaction).filter(Transaction.campaign_id == campaign.id).all()
    current_amount_paise = sum(int(t.amount) for t in txns) if txns else 0
    txn_count = len(txns)

    score = campaign.campaign_score
    active_entities_count = max(len(campaign.entity_ids), 1)

    # Compute this campaign's own average transaction amount in paise
    if txns and current_amount_paise > 0:
        campaign_avg_txn_paise = float(current_amount_paise) / float(txn_count)
    else:
        campaign_avg_txn_paise = 150000.0  # ₹1,500 standard fallback

    # 2. Query historical resolved/contained campaigns in DB to compute empirical txns-per-entity throughput multiplier
    historical_campaigns = db.query(Campaign).filter(
        Campaign.status.in_([CampaignStatus.contained, CampaignStatus.resolved]),
        Campaign.id != campaign.id,
    ).all()

    historical_escalation_multipliers: List[float] = []
    comparable_count = 0

    for hc in historical_campaigns:
        # Ratio of total uncontained capacity vs observed initial phase
        h_high = hc.exposure_at_risk_high_paise or 45000000
        h_low = hc.exposure_at_risk_low_paise or 15000000
        if h_low > 0:
            historical_escalation_multipliers.append(float(h_high) / float(h_low))
        comparable_count += 1

    if historical_escalation_multipliers:
        hist_multiplier_mean = float(np.mean(historical_escalation_multipliers)) # e.g. ~3.0x
        hist_multiplier_std = float(np.std(historical_escalation_multipliers)) if len(historical_escalation_multipliers) > 1 else 0.5
    else:
        hist_multiplier_mean = 2.5
        hist_multiplier_std = 0.5

    # 3. Expected capacity per entity anchored to THIS campaign's ticket size
    # Expected transactions per entity across uncontained lifecycle = 2 to 4 transactions per entity
    txns_per_entity_low = 1.2
    txns_per_entity_high = txns_per_entity_low * hist_multiplier_mean # ~3.6 txns per entity

    per_entity_low_paise = campaign_avg_txn_paise * txns_per_entity_low
    per_entity_high_paise = campaign_avg_txn_paise * txns_per_entity_high

    p_fraud = max(min(score, 1.0), 0.5)

    # Low Bound: Floor at current observed + 10% or entity capacity projection
    raw_low_paise = int(active_entities_count * per_entity_low_paise * p_fraud)
    low_bound_paise = max(raw_low_paise, int(current_amount_paise * 1.15)) if current_amount_paise > 0 else raw_low_paise

    # High Bound: Scaled by historical uncontained escalation multiplier and velocity
    raw_high_paise = int(active_entities_count * per_entity_high_paise * p_fraud)
    high_bound_paise = max(raw_high_paise, int(low_bound_paise * 1.8))

    # Confidence calculation based on historical sample size and campaign score
    sample_confidence = min(0.50 + (comparable_count * 0.15), 0.90)
    score_confidence = 0.50 + (score * 0.40)
    exposure_confidence = round(min((sample_confidence * 0.5 + score_confidence * 0.5), 0.96), 2)

    return {
        "campaign_id": campaign.id,
        "current_observed_paise": current_amount_paise,
        "current_observed_inr": round(current_amount_paise / 100.0, 2),
        "exposure_at_risk_low_paise": low_bound_paise,
        "exposure_at_risk_low_inr": round(low_bound_paise / 100.0, 2),
        "exposure_at_risk_high_paise": high_bound_paise,
        "exposure_at_risk_high_inr": round(high_bound_paise / 100.0, 2),
        "exposure_confidence": exposure_confidence,
        "attributed_transactions_count": txn_count,
        "participating_entities_count": active_entities_count,
        "basis": {
            "active_suspicious_entities": active_entities_count,
            "historical_comparable_campaigns": comparable_count,
            "campaign_avg_transaction_paise": round(campaign_avg_txn_paise, 2),
            "campaign_avg_transaction_inr": round(campaign_avg_txn_paise / 100.0, 2),
            "historical_escalation_multiplier": round(hist_multiplier_mean, 2),
            "per_entity_range_paise": [round(per_entity_low_paise, 2), round(per_entity_high_paise, 2)],
            "per_entity_range_inr": [round(per_entity_low_paise / 100.0, 2), round(per_entity_high_paise / 100.0, 2)],
        },
    }