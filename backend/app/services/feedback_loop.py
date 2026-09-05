from __future__ import annotations
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.human_review import HumanReview, ReviewDecision
from app.models.investigation import Investigation
from app.models.transaction import Transaction


def find_similar_cases(investigation: Optional[Investigation], db: Session, txn: Optional[Transaction] = None, limit: int = 5) -> List[dict]:
    similar = []

    if txn is None and investigation is not None:
        txn = investigation.transaction
        if txn is None:
            txn = db.query(Transaction).filter(Transaction.id == investigation.transaction_id).first()

    if txn is None:
        return []

    current_inv_id = str(investigation.id) if investigation else None

    overridden_reviews = db.query(HumanReview).filter(
        HumanReview.decision == ReviewDecision.overridden
    ).order_by(HumanReview.created_at.desc()).limit(50).all()

    for review in overridden_reviews:
        inv = db.query(Investigation).filter(
            Investigation.id == review.investigation_id
        ).first()
        if inv is None or (current_inv_id and str(inv.id) == current_inv_id):
            continue

        past_txn = db.query(Transaction).filter(Transaction.id == inv.transaction_id).first()
        if past_txn is None or past_txn.id == txn.id:
            continue

        is_similar = False
        reasons = []

        if str(past_txn.customer_id) == str(txn.customer_id):
            is_similar = True
            reasons.append("Same customer")
        if past_txn.device_id and str(past_txn.device_id) == str(txn.device_id):
            is_similar = True
            reasons.append("Shared device")
        if past_txn.ip_id and str(past_txn.ip_id) == str(txn.ip_id):
            is_similar = True
            reasons.append("Shared IP")
        if past_txn.instrument_id and str(past_txn.instrument_id) == str(txn.instrument_id):
            is_similar = True
            reasons.append("Shared payment instrument")
        if txn.risk_score is not None and past_txn.risk_score is not None:
            if abs(txn.risk_score - past_txn.risk_score) <= 12.0:
                is_similar = True
                reasons.append(f"Similar risk score ({past_txn.risk_score:.1f} vs {txn.risk_score:.1f})")

        if is_similar:
            similar.append({
                "investigation_id": str(inv.id),
                "transaction_id": str(past_txn.id),
                "similarity_reason": ", ".join(reasons),
                "ai_recommended": inv.recommended_action.value if inv.recommended_action else None,
                "analyst_overrode_to": review.final_action.value,
                "reviewer": review.reviewer_name,
                "review_reason": review.reason or "Analyst override",
            })

        if len(similar) >= limit:
            break

    return similar