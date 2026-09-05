import uuid
import enum
from sqlalchemy import String, Enum, Float, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class EntityType(str, enum.Enum):
    customer = "customer"
    device = "device"
    ip = "ip"
    instrument = "instrument"


class EntityLink(Base):
    __tablename__ = "entity_links"
    __table_args__ = (
        UniqueConstraint("entity_a_type", "entity_a_id", "entity_b_type", "entity_b_id", "relationship", name="uq_entity_link"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    entity_a_type: Mapped[EntityType] = mapped_column(Enum(EntityType), nullable=False, index=True)
    entity_a_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    entity_b_type: Mapped[EntityType] = mapped_column(Enum(EntityType), nullable=False, index=True)
    entity_b_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)
    strength: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)