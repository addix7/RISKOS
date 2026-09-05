import uuid
import enum
from datetime import datetime
from sqlalchemy import Text, Enum, Float, ForeignKey, DateTime, Uuid, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

try:
    from sqlalchemy.dialects.postgresql import JSONB
    JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
except ImportError:
    JSON_TYPE = JSON


class RecommendedAction(str, enum.Enum):
    allow = "allow"
    verify = "verify"
    hold = "hold"
    block = "block"


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("transactions.id"), nullable=False, index=True)
    evidence: Mapped[dict] = mapped_column(JSON_TYPE, nullable=True)
    ai_conclusion: Mapped[str] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[RecommendedAction] = mapped_column(Enum(RecommendedAction), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    transaction = relationship("Transaction", back_populates="investigations")
    human_reviews = relationship("HumanReview", back_populates="investigation", lazy="dynamic")