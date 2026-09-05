import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    account_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    trust_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)

    transactions = relationship("Transaction", back_populates="customer", lazy="dynamic")