"""Tests for AI Document Ingestion, Privacy-Preserving Redaction Pipeline, and Vector Indexing."""
import pytest
import io
import json
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session

from app.core.database import Base, get_db
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.evidence import Evidence, EvidenceCategory
from app.models.embedding import DocumentEmbedding
from app.ai.redactor import DataRedactor
from app.ai.parser import DocumentParser
from app.ai.vector_store import VectorStoreService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# ==========================================
# 1. Data Redaction Engine Tests
# ==========================================

def test_redactor_ipv4_and_ipv6():
    """Confirms IPv4 and IPv6 addresses are redacted without affecting CAF codes."""
    sample_text = (
        "Active Directory domain controller is hosted on 192.168.1.15:443. "
        "Secondary DNS resides at 10.0.4.254 and IPv6 fe80::1ff:fe23:4567:890a. "
        "NCSC CAF Outcome B2.a requires version v4.0 compliance across Principle B2."
    )
    redacted = DataRedactor.redact(sample_text)

    # IPs must be redacted
    assert "192.168.1.15" not in redacted
    assert "10.0.4.254" not in redacted
    assert "fe80::1ff:fe23:4567:890a" not in redacted
    assert "[REDACTED_IP]" in redacted

    # CAF taxonomy symbols must remain intact
    assert "B2.a" in redacted
    assert "v4.0" in redacted
    assert "Principle B2" in redacted


def test_redactor_internal_hostnames():
    """Confirms *.gov.uk and internal domain patterns are redacted."""
    sample_text = (
        "Internal services include srv-sql-01.internal, casework.borsetshire.gov.uk, "
        "and vault01.local. General text regarding internal governance and local authority operations."
    )
    redacted = DataRedactor.redact(sample_text)

    assert "srv-sql-01.internal" not in redacted
    assert "casework.borsetshire.gov.uk" not in redacted
    assert "vault01.local" not in redacted
    assert "[REDACTED_HOST]" in redacted

    # Normal dictionary words must not be mangled
    assert "internal governance" in redacted
    assert "local authority" in redacted


def test_redactor_pii_emails_phones_and_nino():
    """Confirms UK National Insurance numbers, staff emails, and phone numbers are redacted."""
    sample_text = (
        "Assessor contact: david.cameron@borsetshire.gov.uk, mobile: 07911 123456, "
        "office: +44 20 7946 0192. Statutory worker NI Number: QQ 12 34 56 C."
    )
    redacted, stats = DataRedactor.redact_with_stats(sample_text)

    assert "david.cameron@borsetshire.gov.uk" not in redacted
    assert "07911 123456" not in redacted
    assert "QQ 12 34 56 C" not in redacted
    assert "[REDACTED_PII]" in redacted
    assert stats["pii"] >= 3


def test_redactor_credentials_and_secrets():
    """Confirms passwords, API tokens, and private keys are sanitized."""
    sample_text = (
        "DB connection string: server=db; password=P@ssw0rd2026!; user=admin.\n"
        "API Integration: api_key='sk-live-99238472938472'\n"
        "Bearer token: bearer: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_random\n"
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y2\n-----END RSA PRIVATE KEY-----"
    )
    redacted = DataRedactor.redact(sample_text)

    assert "P@ssw0rd2026!" not in redacted
    assert "sk-live-99238472938472" not in redacted
    assert "MIIEowIBAAKCAQEA0Y2" not in redacted
    assert "[REDACTED_SECRET]" in redacted


def test_redaction_on_realistic_pentest_report():
    """End-to-end redaction on a realistic simulated council pentest excerpt."""
    pentest_excerpt = (
        "EXECUTIVE SUMMARY - BORSETSHIRE COUNCIL INFRASTRUCTURE PENTEST\n"
        "Lead Assessor: Jane Doe (jane.doe@cyber-assure.gov.uk, phone +44 7700 900123, NI: NR 65 43 21 A).\n"
        "During vulnerability assessment on 10.14.2.80 and gateway 192.168.100.1, the team compromised "
        "the domain controller dc01.borsetshire.internal using default password=Summer2026!.\n"
        "The server exposed JWT token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGJvcmRlc2V0c2hpcmUuZ292LnVrIn0.signature_hash "
        "and established communication with 172.16.50.4:8443 on backup-srv.local."
    )

    redacted, stats = DataRedactor.redact_with_stats(pentest_excerpt)

    # Verify no leaked raw entities
    assert "10.14.2.80" not in redacted
    assert "192.168.100.1" not in redacted
    assert "172.16.50.4" not in redacted
    assert "dc01.borsetshire.internal" not in redacted
    assert "backup-srv.local" not in redacted
    assert "jane.doe@cyber-assure.gov.uk" not in redacted
    assert "+44 7700 900123" not in redacted
    assert "NR 65 43 21 A" not in redacted
    assert "Summer2026!" not in redacted
    assert "signature_hash" not in redacted

    # Verify placeholders are present
    assert "[REDACTED_IP]" in redacted
    assert "[REDACTED_HOST]" in redacted
    assert "[REDACTED_PII]" in redacted
    assert "[REDACTED_SECRET]" in redacted
    assert stats["total"] >= 8


# ==========================================
# 2. Document Parser & Chunker Tests
# ==========================================

def test_document_parser_csv_and_json():
    """Verifies text extraction from CSV and JSON files."""
    csv_bytes = b"Server,IP,Status\ndc01,10.0.0.1,Active\nsql01,10.0.0.2,Standby"
    csv_text = DocumentParser.extract_text(csv_bytes, "inventory.csv", "text/csv")
    assert "dc01 | 10.0.0.1 | Active" in csv_text

    json_bytes = json.dumps({"policy": "Password Standard", "min_length": 14}).encode("utf-8")
    json_text = DocumentParser.extract_text(json_bytes, "policy.json", "application/json")
    assert "Password Standard" in json_text
    assert "14" in json_text


def test_document_parser_sliding_window_chunking():
    """Verifies chunking text with sliding-window overlap."""
    # Generate long text with paragraphs
    paragraphs = [
        f"Paragraph {i}: The council maintains comprehensive identity and access control protocols aligned to NCSC B2.a."
        for i in range(40)
    ]
    full_text = "\n\n".join(paragraphs)

    chunks = DocumentParser.chunk_text(full_text, chunk_size_tokens=100, overlap_tokens=20)
    assert len(chunks) > 1

    # Check structure
    for idx, c in enumerate(chunks):
        assert c["chunk_index"] == idx
        assert len(c["text"]) > 0
        assert c["token_count"] > 0
        assert c["char_start"] < c["char_end"]


# ==========================================
# 3. Vector Store Service Tests
# ==========================================

@pytest.fixture(scope="function")
async def ai_db_env():
    """Initializes in-memory test DB for VectorStoreService."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        tenant_a = CouncilTenant(name="Borsetshire Council", authority_type=AuthorityType.UNITARY)
        tenant_b = CouncilTenant(name="Barsetshire County", authority_type=AuthorityType.COUNTY)
        session.add_all([tenant_a, tenant_b])
        await session.flush()

        evidence_a = Evidence(
            tenant_id=tenant_a.id,
            title="Active Directory Hardening Standard v2.1",
            category=EvidenceCategory.POLICY,
            file_path="/evidence/ad_policy.txt",
            file_name="ad_policy.txt",
            sha256_hash="abc123hash",
        )
        session.add(evidence_a)
        await session.commit()

        env = {
            "session_factory": async_session,
            "tenant_a_id": tenant_a.id,
            "tenant_b_id": tenant_b.id,
            "evidence_a_id": evidence_a.id,
        }

    yield env
    await engine.dispose()


@pytest.mark.asyncio
async def test_vector_store_service_storage_and_cosine_search(ai_db_env):
    """
    Verifies that:
    1. Chunks are automatically redacted before embedding.
    2. 1536-dim vector embeddings are generated and persisted.
    3. Semantic similarity search retrieves relevant chunks.
    4. Tenant isolation ensures no cross-council leakage.
    """
    env = ai_db_env
    session_factory = env["session_factory"]

    raw_chunks = [
        "Policy Section 1: All administrator accounts on dc01.borsetshire.gov.uk (10.0.1.10) must enforce FIDO2 multi-factor authentication (MFA). Contact david@borsetshire.gov.uk.",
        "Policy Section 2: Backup archives on storage.internal (192.168.5.20) must be immutable for 30 days using AWS S3 Object Lock or hardened Linux repositories.",
        "Policy Section 3: Staff physical access badges must be revoked within 24 hours of employee departure from council premises.",
    ]

    async with session_factory() as db:
        stored = await VectorStoreService.store_document_chunks(
            db=db,
            tenant_id=env["tenant_a_id"],
            evidence_id=env["evidence_a_id"],
            chunks=raw_chunks,
        )

        assert len(stored) == 3
        # Check that stored text was sanitized
        chunk0 = stored[0]
        assert "10.0.1.10" not in chunk0.chunk_text_redacted
        assert "dc01.borsetshire.gov.uk" not in chunk0.chunk_text_redacted
        assert "david@borsetshire.gov.uk" not in chunk0.chunk_text_redacted
        assert "[REDACTED_IP]" in chunk0.chunk_text_redacted
        assert "[REDACTED_HOST]" in chunk0.chunk_text_redacted
        assert "[REDACTED_PII]" in chunk0.chunk_text_redacted

        # Check embedding length
        assert len(chunk0.embedding) == 1536

        # Query 1: Search for MFA / administrator authentication
        query_mfa = "FIDO2 multi-factor authentication for administrative accounts"
        results_mfa = await VectorStoreService.search_similar_chunks(
            db=db,
            tenant_id=env["tenant_a_id"],
            query_text=query_mfa,
            limit=1,
        )

        assert len(results_mfa) == 1
        top_match, score = results_mfa[0]
        assert top_match.chunk_index == 0
        assert score > 0.0

        # Query 2: Search for backups and immutability
        query_backup = "immutable backup repositories and object lock"
        results_backup = await VectorStoreService.search_similar_chunks(
            db=db,
            tenant_id=env["tenant_a_id"],
            query_text=query_backup,
            limit=1,
        )

        assert len(results_backup) == 1
        top_backup, score_backup = results_backup[0]
        assert top_backup.chunk_index == 1

        # Query 3: Multi-tenant isolation - Tenant B cannot search Tenant A's embeddings
        results_tenant_b = await VectorStoreService.search_similar_chunks(
            db=db,
            tenant_id=env["tenant_b_id"],
            query_text=query_mfa,
            limit=5,
        )
        assert len(results_tenant_b) == 0
