import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel
from app.models.investigation import RecommendedAction


class InvestigationCreate(BaseModel):
    transaction_id: uuid.UUID


class InvestigationResponse(BaseModel):
    id: uuid.UUID
    transaction_id: uuid.UUID
    evidence: Optional[Any] = None
    ai_conclusion: Optional[str] = None
    recommended_action: Optional[RecommendedAction] = None
    confidence: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
