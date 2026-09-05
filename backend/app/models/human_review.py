import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, Enum, ForeignKey, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ReviewDecision(str, enum.Enum):
    approved_ai_recommendation = "approved_ai_recommendation"
    overridden = "overridden"


class FinalAction(str, enum.Enum):
    allow = "allow"
    verify = "verify"
    hold = "hold"
    block = "block"


class HumanReview(Base):
    __tablename__ = "human_reviews"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investigations.id"), nullable=False, index=True)
    reviewer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    decision: Mapped[ReviewDecision] = mapped_column(Enum(ReviewDecision), nullable=False)
    final_action: Mapped[FinalAction] = mapped_column(Enum(FinalAction), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    investigation = relationship("Investigation", back_populates="human_reviews")