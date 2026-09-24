"""Assessment Models & Evaluation Records."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssessmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    ARCHIVED = "ARCHIVED"

class OutcomeStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    ACHIEVED = "ACHIEVED"
    PARTIALLY_ACHIEVED = "PARTIALLY_ACHIEVED"
    NOT_ACHIEVED = "NOT_ACHIEVED"

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    scope_description = Column(Text, nullable=False)
    status = Column(Enum(AssessmentStatus), nullable=False, default=AssessmentStatus.DRAFT)
    council_service_name = Column(String(255), nullable=True)  # e.g., "Adult Social Care Systems"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="assessments")
    outcomes = relationship("AssessmentOutcome", back_populates="assessment", cascade="all, delete-orphan")
    remediation_tasks = relationship("RemediationTask", back_populates="assessment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Assessment(id={self.id}, title='{self.title}', status={self.status})>"

class AssessmentOutcome(Base):
    __tablename__ = "assessment_outcomes"
    __table_args__ = (
        UniqueConstraint("assessment_id", "outcome_id", name="uq_assessment_outcome"),
    )

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    assessment_id = Column(Uuid, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_id = Column(String(20), ForeignKey("contributing_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OutcomeStatus), nullable=False, default=OutcomeStatus.NOT_STARTED)
    assessor_rationale = Column(Text, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    assessed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assessment = relationship("Assessment", back_populates="outcomes")
    contributing_outcome = relationship("ContributingOutcome")
    igp_checks = relationship("AssessmentIGPCheck", back_populates="assessment_outcome", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<AssessmentOutcome(id={self.id}, outcome='{self.outcome_id}', status={self.status})>"

class AssessmentIGPCheck(Base):
    __tablename__ = "assessment_igp_checks"
    __table_args__ = (
        UniqueConstraint("assessment_outcome_id", "igp_id", name="uq_assessment_outcome_igp"),
    )

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    assessment_outcome_id = Column(Uuid, ForeignKey("assessment_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    igp_id = Column(Uuid, ForeignKey("igps.id", ondelete="CASCADE"), nullable=False, index=True)
    is_satisfied = Column(Boolean, default=False, nullable=False)

    # Relationships
    assessment_outcome = relationship("AssessmentOutcome", back_populates="igp_checks")
    igp = relationship("IGP")

    def __repr__(self) -> str:
        return f"<AssessmentIGPCheck(id={self.id}, satisfied={self.is_satisfied})>"
