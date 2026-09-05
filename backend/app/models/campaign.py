import uuid
import enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import String, Enum, BigInteger, Float, DateTime, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CampaignStatus(str, enum.Enum):
    watchlist = "watchlist"
    forming = "forming"
    active = "active"
    contained = "contained"
    resolved = "resolved"
    false_positive = "false_positive"


class CampaignPolicy(str, enum.Enum):
    allow = "allow"
    challenge = "challenge"
    contain = "contain"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.forming, nullable=False, index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    campaign_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)

    entity_ids: Mapped[List[Dict[str, Any]]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False)
    entry_point: Mapped[str] = mapped_column(String(255), nullable=False)
    legitimate_event_check: Mapped[Dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False)

    exposure_at_risk_low_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    exposure_at_risk_high_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    exposure_confidence: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)

    recommended_policy: Mapped[CampaignPolicy] = mapped_column(Enum(CampaignPolicy), default=CampaignPolicy.contain, nullable=False)
    contained_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    events = relationship("CampaignEvent", back_populates="campaign", lazy="dynamic", cascade="all, delete-orphan")