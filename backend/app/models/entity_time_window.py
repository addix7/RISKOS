import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum, BigInteger, Integer, Float, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class WindowEntityType(str, enum.Enum):
    device = "device"
    ip = "ip"
    merchant = "merchant"
    beneficiary = "beneficiary"
    account_cluster = "account_cluster"


class WindowSize(str, enum.Enum):
    m5 = "5m"
    m15 = "15m"
    h1 = "1h"
    h24 = "24h"


class EntityTimeWindow(Base):
    __tablename__ = "entity_time_windows"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[WindowEntityType] = mapped_column(Enum(WindowEntityType), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    window_size: Mapped[WindowSize] = mapped_column(Enum(WindowSize), nullable=False, index=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    transaction_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_accounts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_devices: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_ips: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    new_edges_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    device_entropy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ip_entropy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    asn_entropy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)