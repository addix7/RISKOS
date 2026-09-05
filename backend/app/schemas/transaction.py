import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.transaction import TransactionStatus, RiskLabel


class TransactionCreate(BaseModel):
    customer_id: uuid.UUID
    merchant_id: uuid.UUID
    amount: int = Field(..., gt=0, description="Transaction amount in paise (must be greater than 0)")
    currency: str = Field(default="INR", max_length=10)
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    instrument_hash: Optional[str] = None
    instrument_type: Optional[str] = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    merchant_id: uuid.UUID
    amount: int
    currency: str
    status: TransactionStatus
    created_at: datetime
    risk_score: Optional[float] = None
    risk_label: Optional[RiskLabel] = None
    amount_inr: float = Field(default=0.0, description="Amount in INR (paise / 100)")

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        object.__setattr__(self, "amount_inr", round(self.amount / 100, 2))


class RiskScoreResponse(BaseModel):
    transaction_id: uuid.UUID
    risk_score: float
    risk_label: RiskLabel
    feature_contributions: dict
    features: dict


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    limit: int
    offset: int