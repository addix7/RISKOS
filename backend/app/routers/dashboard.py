import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, SessionLocal
from app.models.transaction import Transaction, RiskLabel, TransactionStatus
from app.models.investigation import Investigation
from app.models.human_review import HumanReview
from app.models.campaign import Campaign, CampaignStatus
from app.services.exposure_engine import calculate_campaign_exposure
from app.schemas.dashboard import DashboardSummary, LiveActivityItem

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Command center summary metrics:
    - total_transactions: total transaction volume
    - high_risk_count: transactions in hold/block tier
    - loss_prevented: cumulative volume saved by blocked transactions
    - live_activity: recent transactions with clear human-reviewed vs ML status semantics.
    """
    total = db.query(func.count(Transaction.id)).scalar() or 0

    high_risk = db.query(func.count(Transaction.id)).filter(
        Transaction.risk_label.in_([RiskLabel.hold, RiskLabel.block])
    ).scalar() or 0

    loss_prevented = db.query(func.sum(Transaction.amount)).filter(
        Transaction.risk_label == RiskLabel.block,
    ).scalar() or 0

    recent = db.query(Transaction).filter(
        Transaction.risk_score.isnot(None)
    ).order_by(Transaction.created_at.desc()).limit(15).all()

    reviewed_txns = set()
    reviews = db.query(Investigation.transaction_id).join(
        HumanReview, HumanReview.investigation_id == Investigation.id
    ).all()
    for (tid,) in reviews:
        reviewed_txns.add(tid)

    live_activity = [
        LiveActivityItem(
            transaction_id=str(t.id),
            amount=int(t.amount),
            amount_inr=round(int(t.amount) / 100, 2),
            risk_score=t.risk_score,
            status=t.risk_label.value.upper() if t.risk_label else t.status.value.upper(),
            lifecycle_status=t.status.value,
            is_reviewed=(t.id in reviewed_txns),
        )
        for t in recent
    ]

    return DashboardSummary(
        total_transactions=total,
        high_risk_count=high_risk,
        loss_prevented_paise=int(loss_prevented),
        loss_prevented_inr=round(int(loss_prevented) / 100, 2),
        live_activity=live_activity,
    )


@router.get("/live-attack-map")
def get_live_attack_map(db: Session = Depends(get_db)):
    """
    Returns lightweight summary of forming/active/watchlist campaigns for frontend dashboard tiles.
    """
    campaigns = db.query(Campaign).filter(
        Campaign.status.in_([CampaignStatus.forming, CampaignStatus.active, CampaignStatus.watchlist])
    ).order_by(Campaign.campaign_score.desc()).all()

    tiles = []
    for c in campaigns:
        exp = calculate_campaign_exposure(c, db)
        tiles.append({
            "campaign_id": str(c.id),
            "status": c.status.value,
            "campaign_score": c.campaign_score,
            "confidence": c.confidence,
            "entities_count": len(c.entity_ids),
            "recommended_policy": c.recommended_policy.value,
            "exposure_range_inr": {
                "current_observed": exp["current_observed_inr"],
                "low_bound": exp["exposure_at_risk_low_inr"],
                "high_bound": exp["exposure_at_risk_high_inr"],
            },
            "detected_at": c.detected_at.isoformat() if c.detected_at else None,
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_campaigns_count": len(tiles),
        "campaigns": tiles,
    }


@router.get("/live")
def get_live_activity_feed(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Optimized live feed endpoint for frontend polling.
    Returns latest transaction scoring and review activity in reverse chronological order.
    """
    recent = db.query(Transaction).order_by(
        Transaction.created_at.desc()
    ).limit(limit).all()

    reviewed_txns = set()
    reviews = db.query(Investigation.transaction_id).join(
        HumanReview, HumanReview.investigation_id == Investigation.id
    ).all()
    for (tid,) in reviews:
        reviewed_txns.add(tid)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "count": len(recent),
        "events": [
            {
                "transaction_id": str(t.id),
                "customer_id": str(t.customer_id),
                "merchant_id": str(t.merchant_id),
                "amount_paise": int(t.amount),
                "amount_inr": round(int(t.amount) / 100, 2),
                "currency": t.currency,
                "status": t.risk_label.value.upper() if t.risk_label else t.status.value.upper(),
                "lifecycle_status": t.status.value,
                "risk_score": t.risk_score,
                "risk_label": t.risk_label.value if t.risk_label else None,
                "is_reviewed": (t.id in reviewed_txns),
                "created_at": t.created_at.isoformat(),
            }
            for t in recent
        ],
    }


@router.get("/stream")
async def stream_live_activity():
    """
    Server-Sent Events (SSE) stream for real-time frontend command center.
    Emits live transaction updates every 3 seconds.
    """
    async def event_generator():
        while True:
            db = SessionLocal()
            try:
                latest = db.query(Transaction).filter(
                    Transaction.risk_score.isnot(None)
                ).order_by(Transaction.created_at.desc()).limit(5).all()

                data = [
                    {
                        "transaction_id": str(t.id),
                        "amount_inr": round(int(t.amount) / 100, 2),
                        "risk_score": t.risk_score,
                        "status": t.risk_label.value.upper() if t.risk_label else t.status.value.upper(),
                        "lifecycle_status": t.status.value,
                        "timestamp": t.created_at.isoformat(),
                    }
                    for t in latest
                ]
                yield f"data: {json.dumps(data)}\n\n"
            finally:
                db.close()
            await asyncio.sleep(3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")