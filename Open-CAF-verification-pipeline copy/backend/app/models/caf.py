"""NCSC Cyber Assessment Framework (CAF v4.0) Taxonomy Models."""
import uuid
import enum
from sqlalchemy import Column, String, Text, Integer, Enum, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class IGPLevel(str, enum.Enum):
    ACHIEVED = "ACHIEVED"
    PARTIALLY_ACHIEVED = "PARTIALLY_ACHIEVED"
    NOT_ACHIEVED = "NOT_ACHIEVED"

class Objective(Base):
    """CAF Objective (A, B, C, D)."""
    __tablename__ = "objectives"

    id = Column(String(10), primary_key=True)  # e.g., 'A', 'B', 'C', 'D'
    code = Column(String(10), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Relationships
    principles = relationship("Principle", back_populates="objective", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Objective(id='{self.id}', title='{self.title}')>"

class Principle(Base):
    """CAF Principle (A1, A2, ... D2)."""
    __tablename__ = "principles"

    id = Column(String(10), primary_key=True)  # e.g., 'A1', 'B2'
    objective_id = Column(String(10), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(10), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Relationships
    objective = relationship("Objective", back_populates="principles")
    outcomes = relationship("ContributingOutcome", back_populates="principle", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Principle(id='{self.id}', title='{self.title}')>"

class ContributingOutcome(Base):
    """CAF Contributing Outcome (e.g. A1.a, B2.a, etc. - 39 total)."""
    __tablename__ = "contributing_outcomes"

    id = Column(String(20), primary_key=True)  # e.g., 'A1.a', 'B2.a'
    principle_id = Column(String(10), ForeignKey("principles.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(20), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    guidance_notes = Column(Text, nullable=True)

    # Relationships
    principle = relationship("Principle", back_populates="outcomes")
    igps = relationship("IGP", back_populates="outcome", cascade="all, delete-orphan", order_by="IGP.sort_order")
    evidence_links = relationship("EvidenceOutcomeLink", back_populates="outcome", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ContributingOutcome(id='{self.id}', title='{self.title}')>"

class IGP(Base):
    """Indicator of Good Practice for a Contributing Outcome."""
    __tablename__ = "igps"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    outcome_id = Column(String(20), ForeignKey("contributing_outcomes.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Enum(IGPLevel), nullable=False)
    description = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    # Relationships
    outcome = relationship("ContributingOutcome", back_populates="igps")

    def __repr__(self) -> str:
        return f"<IGP(id={self.id}, outcome='{self.outcome_id}', level={self.level})>"
