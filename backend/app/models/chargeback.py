import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum, ForeignKey, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChargebackStatus(str, enum.Enum):
    open = "open"
    evidence_submitted = "evidence_submitted"
    won = "won"
    lost = "lost"


class Chargeback(Base):
    __tablename__ = "chargebacks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("transactions.id"), nullable=False, index=True)
    filed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    status: Mapped[ChargebackStatus] = mapped_column(Enum(ChargebackStatus), default=ChargebackStatus.open, nullable=False)
    evidence_pack_url: Mapped[str] = mapped_column(String(500), nullable=True)

    transaction = relationship("Transaction", back_populates="chargebacks")