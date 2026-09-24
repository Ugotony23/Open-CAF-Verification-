"""AI Suggestion Model for Human-in-the-Loop Open CAF Copilot."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Uuid,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class SuggestionType(str, enum.Enum):
    EVIDENCE_MAPPING = "EVIDENCE_MAPPING"
    GAP_CRITIQUE = "GAP_CRITIQUE"
    REMEDIATION_ACTION = "REMEDIATION_ACTION"


class SuggestionStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class AISuggestion(Base):
    """
    Stores AI-generated Copilot recommendations.
    Enforces Human-in-the-Loop: All suggestions start in PENDING_REVIEW
    and require explicit assessor sign-off via /accept before impacting live assessments.
    """
    __tablename__ = "ai_suggestions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        Uuid,
        ForeignKey("council_tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessment_id = Column(
        Uuid,
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    evidence_id = Column(
        Uuid,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    outcome_id = Column(String(10), nullable=True, index=True)
    gap_id = Column(String(100), nullable=True)

    suggestion_type = Column(Enum(SuggestionType), nullable=False, index=True)
    status = Column(
        Enum(SuggestionStatus),
        nullable=False,
        default=SuggestionStatus.PENDING_REVIEW,
        index=True,
    )

    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    citation_quotes = Column(JSON, nullable=False, default=list)
    confidence_score = Column(Float, nullable=False, default=0.85)

    reviewed_by_user_id = Column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant = relationship("CouncilTenant", backref="ai_suggestions")
    assessment = relationship("Assessment", backref="ai_suggestions")
    evidence = relationship("Evidence", backref="ai_suggestions")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
