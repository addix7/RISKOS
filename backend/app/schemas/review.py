import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.human_review import ReviewDecision, FinalAction


class ReviewCreate(BaseModel):
    reviewer_name: str
    decision: ReviewDecision
    final_action: FinalAction
    reason: Optional[str] = None


class ReviewResponse(BaseModel):
    id: uuid.UUID
    investigation_id: uuid.UUID
    reviewer_name: str
    decision: ReviewDecision
    final_action: FinalAction
    reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingReviewItem(BaseModel):
    investigation_id: uuid.UUID
    transaction_id: uuid.UUID
    recommended_action: Optional[str] = None
    risk_score: Optional[float] = None
    amount: int
    amount_inr: float
    created_at: datetime


class PendingReviewsResponse(BaseModel):
    items: List[PendingReviewItem]
    total: int
    limit: int
    offset: int