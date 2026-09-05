import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.schemas.review import ReviewCreate, ReviewResponse, PendingReviewItem, PendingReviewsResponse
from app.models.investigation import Investigation, RecommendedAction
from app.models.human_review import HumanReview, ReviewDecision, FinalAction
from app.models.transaction import Transaction, TransactionStatus, RiskLabel
from app.services.feedback_loop import find_similar_cases

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/pending", response_model=PendingReviewsResponse)
def list_pending_reviews(
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Offset"),
    db: Session = Depends(get_db),
):
    """List investigations awaiting human decision with pagination."""
    reviewed_stmt = select(HumanReview.investigation_id).distinct()
    query = db.query(Investigation).filter(
        ~Investigation.id.in_(reviewed_stmt)
    )

    total = query.count()
    pending_invs = query.order_by(Investigation.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for inv in pending_invs:
        txn = db.query(Transaction).filter(Transaction.id == inv.transaction_id).first()
        if txn:
            items.append(PendingReviewItem(
                investigation_id=inv.id,
                transaction_id=txn.id,
                recommended_action=inv.recommended_action.value if inv.recommended_action else None,
                risk_score=txn.risk_score,
                amount=int(txn.amount),
                amount_inr=round(int(txn.amount) / 100, 2),
                created_at=inv.created_at,
            ))

    return PendingReviewsResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/{investigation_id}", response_model=ReviewResponse, status_code=201)
def submit_review(
    investigation_id: str,
    body: ReviewCreate,
    db: Session = Depends(get_db),
):
    """Submit analyst decision on an investigation and update transaction status accordingly."""
    try:
        iid = uuid.UUID(investigation_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid investigation_id UUID")

    inv = db.query(Investigation).filter(Investigation.id == iid).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    review = HumanReview(
        investigation_id=iid,
        reviewer_name=body.reviewer_name,
        decision=body.decision,
        final_action=body.final_action,
        reason=body.reason,
    )
    db.add(review)

    txn = db.query(Transaction).filter(Transaction.id == inv.transaction_id).first()
    if txn:
        if body.final_action == FinalAction.allow:
            txn.status = TransactionStatus.approved
            txn.risk_label = RiskLabel.allow
        elif body.final_action == FinalAction.block:
            txn.status = TransactionStatus.declined
            txn.risk_label = RiskLabel.block
        elif body.final_action == FinalAction.hold:
            txn.status = TransactionStatus.held
            txn.risk_label = RiskLabel.hold
        elif body.final_action == FinalAction.verify:
            txn.status = TransactionStatus.pending
            txn.risk_label = RiskLabel.verify

    db.commit()
    db.refresh(review)
    return ReviewResponse.model_validate(review)