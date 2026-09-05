from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.chargeback_service import generate_evidence_pack

router = APIRouter(prefix="/api/chargebacks", tags=["Chargebacks"])


@router.post("/{transaction_id}/evidence-pack")
def create_evidence_pack(transaction_id: str, db: Session = Depends(get_db)):
    """Generate and store a chargeback evidence pack for a transaction."""
    result = generate_evidence_pack(transaction_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
