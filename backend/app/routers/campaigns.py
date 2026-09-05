import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.campaign import Campaign, CampaignStatus, CampaignPolicy
from app.models.campaign_event import CampaignEvent
from app.models.transaction import Transaction, TransactionStatus, RiskLabel
from app.services.exposure_engine import calculate_campaign_exposure
from app.services.campaign_counterfactual import simulate_campaign_counterfactual
from app.services.campaign_metrics import calculate_campaign_metrics

router = APIRouter(prefix="/api/campaigns", tags=["Campaign Detection"])


class ContainmentRequest(BaseModel):
    policy: CampaignPolicy = Field(default=CampaignPolicy.contain, description="Policy to apply: contain or challenge")
    analyst_name: Optional[str] = "Demo Analyst"
    note: Optional[str] = "Coordinated botnet containment executed from RISKOS console."


@router.get("/metrics")
def get_campaign_metrics_endpoint(db: Session = Depends(get_db)):
    """Return system-level Campaign metrics: TTC (Time-to-Containment), ACR, and exposure protected."""
    return calculate_campaign_metrics(db)


@router.get("/active")
def get_active_campaigns(db: Session = Depends(get_db)):
    """List all forming, active, and watchlist campaigns."""
    campaigns = db.query(Campaign).filter(
        Campaign.status.in_([CampaignStatus.forming, CampaignStatus.active, CampaignStatus.watchlist])
    ).order_by(Campaign.campaign_score.desc()).all()

    results = []
    for c in campaigns:
        exp = calculate_campaign_exposure(c, db)
        events = db.query(CampaignEvent).filter(CampaignEvent.campaign_id == c.id).order_by(CampaignEvent.occurred_at.desc()).all()
        results.append({
            "id": c.id,
            "status": c.status.value,
            "detected_at": c.detected_at,
            "campaign_score": c.campaign_score,
            "confidence": c.confidence,
            "entry_point": c.entry_point,
            "recommended_policy": c.recommended_policy.value,
            "exposure": {
                "current_observed_inr": exp["current_observed_inr"],
                "exposure_at_risk_low_inr": exp["exposure_at_risk_low_inr"],
                "exposure_at_risk_high_inr": exp["exposure_at_risk_high_inr"],
                "exposure_confidence": exp["exposure_confidence"],
            },
            "entities_count": len(c.entity_ids),
            "recent_events": [
                {"event_type": e.event_type, "occurred_at": e.occurred_at, "detail": e.detail}
                for e in events[:3]
            ],
        })

    return {"campaigns": results, "count": len(results)}


@router.get("/{campaign_id}")
def get_campaign_detail(campaign_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch full campaign detail including entities, full timeline events, and suppressor proof."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign {campaign_id} not found",
        )

    exp = calculate_campaign_exposure(campaign, db)
    events = db.query(CampaignEvent).filter(CampaignEvent.campaign_id == campaign.id).order_by(CampaignEvent.occurred_at.asc()).all()

    return {
        "id": campaign.id,
        "status": campaign.status.value,
        "detected_at": campaign.detected_at,
        "contained_at": campaign.contained_at,
        "campaign_score": campaign.campaign_score,
        "confidence": campaign.confidence,
        "entry_point": campaign.entry_point,
        "recommended_policy": campaign.recommended_policy.value,
        "resolution": campaign.resolution,
        "exposure": exp,
        "legitimate_event_check": campaign.legitimate_event_check,
        "entity_ids": campaign.entity_ids,
        "timeline_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "occurred_at": e.occurred_at,
                "detail": e.detail,
            }
            for e in events
        ],
    }


@router.post("/{campaign_id}/contain")
def contain_campaign_endpoint(
    campaign_id: uuid.UUID,
    req: ContainmentRequest,
    db: Session = Depends(get_db),
):
    """
    Execute containment or challenge policy across all entities attributed to this campaign.
    Cascades down to all attributed transactions.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign {campaign_id} not found",
        )

    now = datetime.now(timezone.utc)
    campaign.status = CampaignStatus.contained
    campaign.contained_at = now
    campaign.recommended_policy = req.policy
    campaign.resolution = f"Contained by {req.analyst_name} via {req.policy.value} policy: {req.note}"

    # Cascade to attributed transactions
    txns = db.query(Transaction).filter(Transaction.campaign_id == campaign.id).all()
    action_label = "block" if req.policy == CampaignPolicy.contain else "verify"
    
    for t in txns:
        if req.policy == CampaignPolicy.contain:
            t.status = TransactionStatus.declined
            t.risk_label = RiskLabel.block
        elif req.policy == CampaignPolicy.challenge:
            t.status = TransactionStatus.pending
            t.risk_label = RiskLabel.verify

    # Log policy_applied event
    evt = CampaignEvent(
        campaign_id=campaign.id,
        event_type="policy_applied",
        occurred_at=now,
        detail={
            "policy": req.policy.value,
            "analyst_name": req.analyst_name,
            "note": req.note,
            "entities_contained_count": len(campaign.entity_ids),
            "transactions_cascaded_count": len(txns),
            "transaction_action_applied": action_label,
        }
    )
    db.add(evt)
    db.commit()
    db.refresh(campaign)

    return {
        "campaign_id": campaign.id,
        "status": campaign.status.value,
        "contained_at": campaign.contained_at,
        "policy_applied": req.policy.value,
        "transactions_cascaded_count": len(txns),
        "transaction_action_applied": action_label,
        "message": f"Successfully applied {req.policy.value} policy ({action_label}) across {len(txns)} transactions.",
    }


class VerificationRequest(BaseModel):
    analyst_name: Optional[str] = "Demo Analyst"
    note: Optional[str] = "Step-up 2FA/KYC verification challenge enforced across candidate cluster."


@router.post("/{campaign_id}/verify")
def verify_campaign_endpoint(
    campaign_id: uuid.UUID,
    req: VerificationRequest = VerificationRequest(),
    db: Session = Depends(get_db),
):
    """
    Execute step-up verification policy across all entities attributed to this campaign.
    Updates campaign status to active (monitored under step-up) and cascades risk_label=verify
    and status=pending (requiring 2FA/OTP confirmation) to all attributed transactions.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign {campaign_id} not found",
        )

    now = datetime.now(timezone.utc)
    campaign.status = CampaignStatus.active
    campaign.recommended_policy = CampaignPolicy.challenge
    campaign.resolution = f"Step-up verification enforced by {req.analyst_name}: {req.note}"

    # Cascade to attributed transactions
    txns = db.query(Transaction).filter(Transaction.campaign_id == campaign.id).all()
    for t in txns:
        t.status = TransactionStatus.pending
        t.risk_label = RiskLabel.verify

    evt = CampaignEvent(
        campaign_id=campaign.id,
        event_type="step_up_challenge_applied",
        occurred_at=now,
        detail={
            "policy": "verify",
            "analyst_name": req.analyst_name,
            "note": req.note,
            "entities_challenged_count": len(campaign.entity_ids),
            "transactions_cascaded_count": len(txns),
            "transaction_action_applied": "verify",
        }
    )
    db.add(evt)
    db.commit()
    db.refresh(campaign)

    return {
        "campaign_id": campaign.id,
        "status": campaign.status.value,
        "policy_applied": "verify",
        "transactions_cascaded_count": len(txns),
        "transaction_action_applied": "verify",
        "message": f"Successfully enforced step-up verification challenge across {len(txns)} transactions.",
    }


@router.get("/{campaign_id}/counterfactual")
@router.post("/{campaign_id}/counterfactual")
def get_campaign_counterfactual_endpoint(
    campaign_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Compute campaign containment counterfactual comparison (Status Quo vs Challenge vs Contain)."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign {campaign_id} not found",
        )

    return simulate_campaign_counterfactual(campaign, db)