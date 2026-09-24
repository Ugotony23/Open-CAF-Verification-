"""Council Service Criticality Model."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, Enum, ForeignKey, Uuid, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class ServiceTier(str, enum.Enum):
    """Council Service Criticality Tier."""
    TIER_1 = "TIER_1"  # Critical - Life safety, statutory welfare, revenue, statutory elections (Weight 3.0)
    TIER_2 = "TIER_2"  # Operational - Daily public administration & internal operations (Weight 2.0)
    TIER_3 = "TIER_3"  # Informational - Low citizen impact (Weight 1.0)


TIER_WEIGHTS: dict[ServiceTier, float] = {
    ServiceTier.TIER_1: 3.0,
    ServiceTier.TIER_2: 2.0,
    ServiceTier.TIER_3: 1.0,
}


class CouncilService(Base):
    """Local authority service catalog entry with criticality weighting."""
    __tablename__ = "council_services"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tier = Column(Enum(ServiceTier), nullable=False, default=ServiceTier.TIER_2)
    weight_multiplier = Column(Float, nullable=False, default=2.0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="services")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_tenant_service_name"),
    )

    def __repr__(self) -> str:
        return f"<CouncilService(id={self.id}, name='{self.name}', tier={self.tier}, weight={self.weight_multiplier})>"
