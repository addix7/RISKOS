import uuid
from datetime import datetime
from sqlalchemy import Float, Numeric, Integer, DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    f1_score: Mapped[float] = mapped_column(Float, nullable=False)
    false_positive_rate: Mapped[float] = mapped_column(Float, nullable=False)
    false_positive_cost: Mapped[int] = mapped_column(Numeric(precision=15, scale=0), nullable=True)
    test_set_size: Mapped[int] = mapped_column(Integer, nullable=False)