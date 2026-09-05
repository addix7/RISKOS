import uuid
from typing import Optional
from sqlalchemy import Integer, Float, ForeignKey, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class MerchantBaseline(Base):
    __tablename__ = "merchant_baselines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    merchant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("merchants.id"), nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # 0=Monday, 6=Sunday
    hour_of_day: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # 0..23

    avg_transactions_per_window: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    avg_new_accounts_per_window: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)
    avg_device_entropy: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    std_dev_transactions: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)
    known_event_tags: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    merchant = relationship("Merchant")