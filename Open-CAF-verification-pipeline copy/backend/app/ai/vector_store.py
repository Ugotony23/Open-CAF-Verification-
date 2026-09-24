"""Vector Store Service for Open CAF Document Ingestion & Semantic Matching.
Supports pgvector cosine similarity search, chunk redaction prior to embedding,
and local deterministic/fallback embedding generation for offline local council operations.
"""
import math
import hashlib
import uuid
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.embedding import DocumentEmbedding
from app.ai.redactor import DataRedactor

EMBEDDING_DIMENSION = 1536


def _compute_deterministic_embedding(text: str, dimension: int = EMBEDDING_DIMENSION) -> List[float]:
    """
    Generates a deterministic, unit-normalized float vector of length `dimension`
    from input text. Used for offline, zero-dependency local environments and testing.
    Semantic similarity is preserved for shared words/n-grams.
    """
    vec = [0.0] * dimension
    tokens = text.lower().split()
    if not tokens:
        tokens = ["empty"]

    # Hash unigrams and bigrams into vector space
    for i, token in enumerate(tokens):
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest()[:8], 16)
        slot = h % dimension
        weight = 1.0 / math.sqrt(i + 1)
        vec[slot] += weight

        # Bigram
        if i < len(tokens) - 1:
            bigram = f"{token}_{tokens[i+1]}"
            h2 = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest()[:8], 16)
            slot2 = h2 % dimension
            vec[slot2] += weight * 1.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    else:
        vec[0] = 1.0

    return vec


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Computes cosine similarity between two unit-normalized vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a, b in zip(vec_a, vec_b)))
    norm_b = math.sqrt(sum(b * b for a, b in zip(vec_a, vec_b)))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class VectorStoreService:
    """
    Manages document embedding persistence, redaction pipeline enforcement,
    and semantic vector similarity queries.
    """

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates 1536-dimensional embedding vector.
        Uses deterministic local vectorizer for offline zero-trust deployments.
        Can be swapped for sentence-transformers or OpenAI via config.
        """
        return _compute_deterministic_embedding(text, EMBEDDING_DIMENSION)

    @classmethod
    async def store_document_chunks(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        evidence_id: uuid.UUID,
        chunks: List[str],
    ) -> List[DocumentEmbedding]:
        """
        Sanitizes (redacts PII/IPs) each chunk, computes its embedding vector,
        and persists the record to the document_embeddings table.
        """
        stored_records: List[DocumentEmbedding] = []

        for idx, raw_chunk in enumerate(chunks):
            # 1. Enforce privacy-preserving redaction BEFORE embedding
            redacted_chunk = DataRedactor.redact(raw_chunk)

            # 2. Compute vector representation
            emb_vector = cls.generate_embedding(redacted_chunk)

            # 3. Create database record
            rec = DocumentEmbedding(
                tenant_id=tenant_id,
                evidence_id=evidence_id,
                chunk_index=idx,
                chunk_text_redacted=redacted_chunk,
                embedding=emb_vector,
            )
            db.add(rec)
            stored_records.append(rec)

        await db.commit()
        for r in stored_records:
            await db.refresh(r)

        return stored_records

    @classmethod
    async def search_similar_chunks(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        query_text: Optional[str] = None,
        query_embedding: Optional[List[float]] = None,
        limit: int = 5,
    ) -> List[Tuple[DocumentEmbedding, float]]:
        """
        Executes vector cosine similarity search across redacted evidence chunks.
        Compatible with PostgreSQL pgvector (`<=>` operator) and fallback SQLite dialect.
        Returns list of (DocumentEmbedding, similarity_score) sorted descending by similarity.
        """
        if query_embedding is None:
            if not query_text:
                return []
            query_embedding = cls.generate_embedding(query_text)

        # Detect dialect (Postgres pgvector vs SQLite in-memory tests)
        bind = db.bind
        dialect_name = bind.dialect.name if bind else "postgresql"

        if dialect_name == "postgresql":
            # Native PostgreSQL pgvector cosine distance: distance = 1 - similarity
            stmt = (
                select(
                    DocumentEmbedding,
                    DocumentEmbedding.embedding.cosine_distance(query_embedding).label("distance"),
                )
                .filter(DocumentEmbedding.tenant_id == tenant_id)
                .order_by("distance")
                .limit(limit)
            )
            res = await db.execute(stmt)
            results = []
            for row in res.all():
                record = row[0]
                dist = float(row[1]) if row[1] is not None else 1.0
                similarity = max(0.0, 1.0 - dist)
                results.append((record, similarity))
            return results
        else:
            # SQLite / Test in-memory cosine ranking
            stmt = select(DocumentEmbedding).filter(DocumentEmbedding.tenant_id == tenant_id)
            res = await db.execute(stmt)
            records = list(res.scalars().all())

            scored = []
            for r in records:
                r_vec = list(r.embedding) if hasattr(r.embedding, "__iter__") else []
                sim = _cosine_similarity(query_embedding, r_vec)
                scored.append((r, sim))

            # Sort descending by similarity
            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[:limit]
