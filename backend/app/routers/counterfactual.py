import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dashboard import CounterfactualResponse
from app.models.transaction import Transaction
from app.services.counterfactual import simulate

router = APIRouter(prefix="/api/counterfactual", tags=["Counterfactual"])


@router.post("", response_model=CounterfactualResponse)
def run_counterfactual(body: dict, db: Session = Depends(get_db)):
    """Simulate outcomes of allow/verify/hold/block for a transaction."""
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

    risk_score = txn.risk_score or 0.0
    result = simulate(risk_score, int(txn.amount))
    return CounterfactualResponse(
        transaction_id=str(txn.id),
        risk_score=risk_score,
        options=result["options"],
        recommended_action=result["recommended_action"],
    )
