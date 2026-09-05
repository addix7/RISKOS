import uuid
import enum
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Enum, Numeric, DateTime, Float, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"
    disputed = "disputed"
    held = "held"


class RiskLabel(str, enum.Enum):
    allow = "allow"
    verify = "verify"
    hold = "hold"
    block = "block"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("merchants.id"), nullable=False, index=True)
    device_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("devices.id"), nullable=True, index=True)
    ip_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("ip_addresses.id"), nullable=True, index=True)
    instrument_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("payment_instruments.id"), nullable=True, index=True)
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, index=True)

    amount: Mapped[int] = mapped_column(Numeric(precision=15, scale=0), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.pending, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    risk_score: Mapped[float] = mapped_column(Float, nullable=True)
    risk_label: Mapped[RiskLabel] = mapped_column(Enum(RiskLabel), nullable=True)

    customer = relationship("Customer", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")
    ip_address = relationship("IPAddress", back_populates="transactions")
    instrument = relationship("PaymentInstrument", back_populates="transactions")
    investigations = relationship("Investigation", back_populates="transaction", lazy="dynamic")
    chargebacks = relationship("Chargeback", back_populates="transaction", lazy="dynamic")