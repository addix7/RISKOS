import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dashboard import DecisionResponse
from app.models.transaction import Transaction
from app.services.decision_engine import make_decision

router = APIRouter(prefix="/api/decision", tags=["Decision"])


@router.post("", response_model=DecisionResponse)
def get_decision(body: dict, db: Session = Depends(get_db)):
    """Get final recommended action for a transaction."""
    txn_id_str = body.get("transaction_id")
    if not txn_id_str:
        raise HTTPException(status_code=422, detail="transaction_id required")
    try:
        txn_id = uuid.UUID(str(txn_id_str))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid transaction_id")

    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.risk_score is None:
        raise HTTPException(status_code=422, detail="Transaction has not been scored yet. Call POST /api/risk/score first.")

    result = make_decision(txn.risk_score)
    txn.risk_label = result["final_action"]
    db.commit()

    return DecisionResponse(
        transaction_id=str(txn.id),
        risk_score=txn.risk_score,
        risk_band=result["risk_band"],
        final_action=result["final_action"],
        reasoning=result["reasoning"],
        confidence=result["confidence"],
    )
