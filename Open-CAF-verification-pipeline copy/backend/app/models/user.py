"""User & RBAC Model."""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    CISO_ADMIN = "CISO_ADMIN"
    SECURITY_ASSESSOR = "SECURITY_ASSESSOR"
    AUDITOR = "AUDITOR"
    CABINET_VIEWER = "CABINET_VIEWER"

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("council_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SECURITY_ASSESSOR)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    tenant = relationship("CouncilTenant", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    evidence_items = relationship("Evidence", back_populates="uploaded_by")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role={self.role})>"
