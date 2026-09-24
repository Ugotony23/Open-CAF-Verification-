"""Document Embedding Model for pgvector Semantic Search."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    Uuid,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class DocumentEmbedding(Base):
    """
    Stores chunked, redacted text from evidence files alongside pgvector embeddings.
    Embeddings use 1536 dimensions (standard for text-embedding-3-small, Ada-002, or projected vectors).
    """
    __tablename__ = "document_embeddings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        Uuid,
        ForeignKey("council_tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id = Column(
        Uuid,
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    chunk_text_redacted = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant = relationship("CouncilTenant", backref="document_embeddings")
    evidence = relationship("Evidence", backref="document_embeddings")
