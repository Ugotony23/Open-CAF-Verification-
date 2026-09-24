"""Council Tenant Model."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuthorityType(str, enum.Enum):
    UNITARY = "UNITARY"
    COUNTY = "COUNTY"
    DISTRICT = "DISTRICT"
    METROPOLITAN = "METROPOLITAN"
    LONDON_BOROUGH = "LONDON_BOROUGH"

class CouncilTenant(Base):
    __tablename__ = "council_tenants"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    authority_type = Column(Enum(AuthorityType), nullable=False, default=AuthorityType.DISTRICT)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="tenant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="tenant", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="tenant", cascade="all, delete-orphan")
    services = relationship("CouncilService", back_populates="tenant", cascade="all, delete-orphan")
    remediation_tasks = relationship("RemediationTask", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<CouncilTenant(id={self.id}, name='{self.name}', type={self.authority_type})>"
