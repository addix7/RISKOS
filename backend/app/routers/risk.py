import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import RiskScoreResponse
from app.models.transaction import Transaction
from app.services.risk_engine import score_transaction

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.post("/score", response_model=RiskScoreResponse)
def score_transaction_endpoint(
    body: dict,
    db: Session = Depends(get_db),
):
    """Score a transaction for fraud risk."""
    txn_id_str = body.get("transaction_id")
    if not txn_id_str:
        raise HTTPException(status_code=422, detail="transaction_id is required")
    try:
        txn_id = uuid.UUID(str(txn_id_str))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid transaction_id")

    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    result = score_transaction(txn, db)

    # Persist score back to transaction
    txn.risk_score = result["risk_score"]
    txn.risk_label = result["risk_label"]
    db.commit()

    return RiskScoreResponse(
        transaction_id=txn.id,
        risk_score=result["risk_score"],
        risk_label=result["risk_label"],
        feature_contributions=result["feature_contributions"],
        features=result["features"],
    )
