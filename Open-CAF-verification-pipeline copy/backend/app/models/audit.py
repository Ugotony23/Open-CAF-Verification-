"""Audit Trail Logging Model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "ASSESSMENT_CREATED", "OUTCOME_EVALUATED"
    entity_type = Column(String(100), nullable=False, index=True)  # e.g., "Assessment", "AssessmentOutcome"
    entity_id = Column(String(100), nullable=False)
    payload_before = Column(JSON, nullable=True)
    payload_after = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action='{self.action}', entity='{self.entity_type}:{self.entity_id}')>"
