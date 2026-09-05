from typing import List, Optional
from pydantic import BaseModel, Field


class LiveActivityItem(BaseModel):
    transaction_id: str
    amount: int
    amount_inr: float
    risk_score: Optional[float] = None
    status: str = Field(description="Active decision label (reflects human analyst override if reviewed, otherwise ML label)")
    lifecycle_status: str = Field(description="Transaction payment lifecycle status: pending, approved, declined, held, disputed")
    is_reviewed: bool = Field(default=False, description="True if a human analyst review has been submitted for this transaction")


class DashboardSummary(BaseModel):
    total_transactions: int
    high_risk_count: int
    loss_prevented_paise: int
    loss_prevented_inr: float
    live_activity: List[LiveActivityItem]


class CounterfactualOption(BaseModel):
    action: str
    estimated_fraud_loss_paise: int
    estimated_fraud_loss_inr: float
    friction_cost_paise: int
    friction_cost_inr: float
    net_expected_value_paise: int
    recommended: bool


class CounterfactualResponse(BaseModel):
    transaction_id: str
    risk_score: float
    options: List[CounterfactualOption]
    recommended_action: str


class DecisionResponse(BaseModel):
    transaction_id: str
    risk_score: float
    risk_band: str
    final_action: str
    reasoning: str
    confidence: float


class SpikeResponse(BaseModel):
    merchant_id: str
    current_count: int
    baseline_mean: float
    baseline_std: float
    threshold: float
    spike_detected: bool
    window_minutes: int


class ModelHealthResponse(BaseModel):
    latest: Optional[dict] = None
    history: List[dict] = []
    fp_rate_by_account_age: dict = {}