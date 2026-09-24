"""Remediation Task Management Model."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Uuid,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class RemediationStatus(str, enum.Enum):
    BACKLOG = "BACKLOG"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RemediationPriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RemediationTask(Base):
    """
    Actionable remediation task generated from an identified CAF gap or manually created,
    scoped to a council tenant and assessment.
    """
    __tablename__ = "remediation_tasks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(Uuid, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_id = Column(String(10), ForeignKey("contributing_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    gap_id = Column(String(100), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    technical_steps = Column(JSON, nullable=True)  # List of step strings or checklist dicts

    status = Column(Enum(RemediationStatus), nullable=False, default=RemediationStatus.BACKLOG, index=True)
    priority = Column(Enum(RemediationPriority), nullable=False, default=RemediationPriority.HIGH, index=True)

    assigned_owner_name = Column(String(255), nullable=True)
    assigned_owner_email = Column(String(255), nullable=True)

    estimated_effort_hours = Column(Float, nullable=False, default=0.0)
    estimated_cost_gbp = Column(Float, nullable=False, default=0.0)

    target_completion_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    external_ticket_id = Column(String(100), nullable=True)  # e.g., JIRA-2041, GH-42

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="remediation_tasks")
    assessment = relationship("Assessment", back_populates="remediation_tasks")
    outcome = relationship("ContributingOutcome")

    def __repr__(self) -> str:
        return f"<RemediationTask(id={self.id}, outcome='{self.outcome_id}', status='{self.status}', priority='{self.priority}')>"
