import uuid
import enum
from sqlalchemy import String, Enum, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class InstrumentType(str, enum.Enum):
    card = "card"
    upi = "upi"
    netbanking = "netbanking"
    wallet = "wallet"


class PaymentInstrument(Base):
    __tablename__ = "payment_instruments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    instrument_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    type: Mapped[InstrumentType] = mapped_column(Enum(InstrumentType), nullable=False)

    transactions = relationship("Transaction", back_populates="instrument", lazy="dynamic")