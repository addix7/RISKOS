import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.investigation import InvestigationCreate, InvestigationResponse
from app.models.investigation import Investigation, RecommendedAction
from app.models.transaction import Transaction
from app.services.investigator import run_investigation

router = APIRouter(prefix="/api/investigations", tags=["Investigations"])


@router.post("", response_model=InvestigationResponse, status_code=201)
def trigger_investigation(body: InvestigationCreate, db: Session = Depends(get_db)):
    """Trigger an AI investigation for a transaction."""
    txn = db.query(Transaction).filter(Transaction.id == body.transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    result = run_investigation(txn, db)

    try:
        action = RecommendedAction(result["recommended_action"])
    except ValueError:
        action = RecommendedAction.hold

    inv = Investigation(
        transaction_id=txn.id,
        evidence={
            "items": result.get("evidence", []),
        },
        ai_conclusion=result.get("ai_conclusion", ""),
        recommended_action=action,
        confidence=result.get("confidence", 0.5),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return InvestigationResponse.model_validate(inv)


@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    """Fetch investigation detail."""
    try:
        iid = uuid.UUID(investigation_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid investigation_id")
    inv = db.query(Investigation).filter(Investigation.id == iid).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationResponse.model_validate(inv)
