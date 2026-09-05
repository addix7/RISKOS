from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dashboard import SpikeResponse
from app.services.spike_detector import get_spike_status

router = APIRouter(prefix="/api/spikes", tags=["Spikes"])


@router.get("/{merchant_id}", response_model=SpikeResponse)
def check_spike(merchant_id: str, db: Session = Depends(get_db)):
    """Check transaction velocity vs. baseline for a merchant."""
    return get_spike_status(merchant_id, db)
