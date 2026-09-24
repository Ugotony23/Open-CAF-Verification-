"""Evidence Model for Cryptographic Tamper-Evident Storage."""
import uuid
import enum
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Date,
    Enum,
    ForeignKey,
    BigInteger,
    Uuid,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class EvidenceCategory(str, enum.Enum):
    POLICY = "POLICY"
    VULNERABILITY_SCAN = "VULNERABILITY_SCAN"
    PENTEST_REPORT = "PENTEST_REPORT"
    INCIDENT_DRILL = "INCIDENT_DRILL"
    ARCHITECTURE_DIAGRAM = "ARCHITECTURE_DIAGRAM"
    AUDIT_LOG = "AUDIT_LOG"
    THIRD_PARTY_ASSURANCE = "THIRD_PARTY_ASSURANCE"

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(EvidenceCategory), nullable=False, index=True)

    file_path = Column(String(1024), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False, default=0)
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    sha256_hash = Column(String(64), nullable=False, index=True)

    external_url = Column(String(1024), nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)

    uploaded_by_user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="evidence_items")
    uploaded_by = relationship("User", back_populates="evidence_items")
    outcome_links = relationship("EvidenceOutcomeLink", back_populates="evidence", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Evidence(id={self.id}, title='{self.title}', category={self.category}, sha256={self.sha256_hash[:8]}...)>"
