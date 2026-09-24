"""Associations and Many-to-Many Linking Models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class EvidenceOutcomeLink(Base):
    __tablename__ = "evidence_outcome_links"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    evidence_id = Column(Uuid, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_id = Column(String(20), ForeignKey("contributing_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    igp_id = Column(Uuid, ForeignKey("igps.id", ondelete="SET NULL"), nullable=True, index=True)
    citation_notes = Column(Text, nullable=True)
    linked_by_user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    linked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    evidence = relationship("Evidence", back_populates="outcome_links")
    outcome = relationship("ContributingOutcome", back_populates="evidence_links")
    igp = relationship("IGP")
    linked_by = relationship("User")

    def __repr__(self) -> str:
        return f"<EvidenceOutcomeLink(id={self.id}, evidence_id={self.evidence_id}, outcome_id='{self.outcome_id}')>"
