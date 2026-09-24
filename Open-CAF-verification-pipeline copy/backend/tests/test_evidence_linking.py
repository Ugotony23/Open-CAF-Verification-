"""Unit & Integration Tests for Evidence Multi-Tagging, Freshness, and Assessment Coverage."""
import io
import pytest
from datetime import datetime, timezone, date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.evidence import Evidence, EvidenceCategory
from app.models.assessment import Assessment, AssessmentStatus
from app.services.evidence_service import EvidenceService, evidence_service
from app.cli.seed_caf import seed_caf_data
from app.schemas.assessment import AssessmentCreate
from app.services.assessment_service import AssessmentService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def linking_test_env():
    """Initializes in-memory database, seeds CAF taxonomy, and provisions tenant/users."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed CAF framework
    from sqlalchemy.orm import Session
    async with engine.connect() as conn:
        def do_seed(connection):
            sync_sess = Session(bind=connection)
            seed_caf_data(session=sync_sess)
            sync_sess.close()
        await conn.run_sync(do_seed)
        await conn.commit()

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        tenant = CouncilTenant(name="Borsetshire Council", authority_type=AuthorityType.UNITARY)
        session.add(tenant)
        await session.flush()

        user = User(
            tenant_id=tenant.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Secret123!"),
            full_name="Arthur Pendelton",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        session.add(user)
        await session.commit()

        token = create_access_token(user.id, tenant.id, user.role.value)
        tenant_id = tenant.id
        user_id = user.id

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "token": token,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "session_factory": async_session,
    }

    app.dependency_overrides.clear()

def test_evidence_freshness_logic_pure():
    """Validates unit logic for stale and expiring soon criteria."""
    today = date(2026, 9, 1)

    # 1. Fresh evidence
    fresh_ev = Evidence(
        title="Fresh Policy",
        category=EvidenceCategory.POLICY,
        file_path="/dummy/path.pdf",
        file_name="path.pdf",
        sha256_hash="hash123",
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        valid_to=date(2027, 5, 1),
    )
    assert not EvidenceService.is_stale(fresh_ev, ref_date=today)
    assert not EvidenceService.is_expiring_soon(fresh_ev, ref_date=today)

    # 2. Expired valid_to
    expired_ev = Evidence(
        title="Expired Policy",
        category=EvidenceCategory.POLICY,
        file_path="/dummy/path.pdf",
        file_name="path.pdf",
        sha256_hash="hash123",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        valid_to=date(2026, 8, 15),  # in the past relative to today
    )
    assert EvidenceService.is_stale(expired_ev, ref_date=today)
    assert not EvidenceService.is_expiring_soon(expired_ev, ref_date=today)

    # 3. Older than 365 days (annual cycle)
    old_upload_ev = Evidence(
        title="Old Annual Upload",
        category=EvidenceCategory.AUDIT_LOG,
        file_path="/dummy/path.pdf",
        file_name="path.pdf",
        sha256_hash="hash123",
        created_at=datetime(2025, 8, 15, tzinfo=timezone.utc),  # ~382 days ago
        valid_to=None,
    )
    assert EvidenceService.is_stale(old_upload_ev, ref_date=today)

    # 4. Expiring soon (< 60 days)
    expiring_soon_ev = Evidence(
        title="Expiring Soon Policy",
        category=EvidenceCategory.POLICY,
        file_path="/dummy/path.pdf",
        file_name="path.pdf",
        sha256_hash="hash123",
        created_at=datetime(2025, 10, 1, tzinfo=timezone.utc),
        valid_to=date(2026, 9, 25),  # 24 days left
    )
    assert not EvidenceService.is_stale(expiring_soon_ev, ref_date=today)
    assert EvidenceService.is_expiring_soon(expiring_soon_ev, days_threshold=60, ref_date=today)

@pytest.mark.asyncio
async def test_evidence_multi_tagging_to_outcomes(linking_test_env):
    """Verifies that an evidence item can be linked to multiple CAF outcomes and unlinked."""
    token = linking_test_env["token"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload unified evidence document
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("Corporate_Security_Policy.pdf", io.BytesIO(b"Policy content"), "application/pdf")},
            data={"title": "Corporate Cyber Security Framework Policy", "category": "POLICY"},
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        # 2. Link to Outcome A1.a
        link_a1a = await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "outcome_id": "A1.a",
                "citation_notes": "Section 2.1: Board cyber direction and governance oversight.",
            },
        )
        assert link_a1a.status_code == 201
        assert link_a1a.json()["outcome_id"] == "A1.a"

        # 3. Link same evidence to Outcome A1.b
        link_a1b = await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "outcome_id": "A1.b",
                "citation_notes": "Section 3.4: Formal CISO responsibilities and reporting lines.",
            },
        )
        assert link_a1b.status_code == 201
        assert link_a1b.json()["outcome_id"] == "A1.b"

        # 4. Link same evidence to Outcome B1.a
        link_b1a = await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "outcome_id": "B1.a",
                "citation_notes": "Section 5: Security policies approved by Cabinet.",
            },
        )
        assert link_b1a.status_code == 201

        # 5. Fetch evidence details and verify all 3 linked outcomes are present
        get_res = await client.get(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_res.status_code == 200
        linked_ids = get_res.json()["linked_outcome_ids"]
        assert "A1.a" in linked_ids
        assert "A1.b" in linked_ids
        assert "B1.a" in linked_ids

        # 6. Unlink from A1.a
        del_res = await client.delete(
            f"/api/v1/evidence/{evidence_id}/link/A1.a",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_res.status_code == 204

        # 7. Check that A1.a is removed, but A1.b and B1.a remain
        get_after = await client.get(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_after.status_code == 200
        remaining_ids = get_after.json()["linked_outcome_ids"]
        assert "A1.a" not in remaining_ids
        assert "A1.b" in remaining_ids
        assert "B1.a" in remaining_ids

@pytest.mark.asyncio
async def test_assessment_evidence_coverage_endpoint(linking_test_env):
    """Verifies coverage metric calculations across all 39 Contributing Outcomes."""
    token = linking_test_env["token"]
    tenant_id = linking_test_env["tenant_id"]
    session_factory = linking_test_env["session_factory"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an assessment
        async with session_factory() as session:
            assessment = await AssessmentService.create_assessment(
                session,
                tenant_id,
                AssessmentCreate(
                    title="2026 Statutory Infrastructure CAF",
                    scope_description="All core citizen systems.",
                ),
            )
            assessment_id = assessment.id

        # Check initial coverage (0 evidenced)
        cov_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/coverage",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert cov_res.status_code == 200
        cov_data = cov_res.json()
        assert cov_data["total_outcomes"] == 39
        assert cov_data["evidenced_outcomes"] == 0
        assert cov_data["unevidenced_outcomes"] == 39
        assert cov_data["coverage_rate"] == 0.0

        # Upload and link an evidence artifact to A1.a and A1.b
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("SIRO_Charter.pdf", io.BytesIO(b"Charter"), "application/pdf")},
            data={"title": "SIRO Appointment Charter", "category": "POLICY"},
        )
        evidence_id = upload_res.json()["id"]

        await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={"outcome_id": "A1.a"},
        )
        await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={"outcome_id": "A1.b"},
        )

        # Check updated coverage
        updated_cov_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/coverage",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert updated_cov_res.status_code == 200
        updated_data = updated_cov_res.json()

        assert updated_data["evidenced_outcomes"] == 2
        assert updated_data["unevidenced_outcomes"] == 37
        assert updated_data["coverage_rate"] == 5.1  # (2/39) * 100 = 5.1%
        assert "A1" in updated_data["principles"]
        assert updated_data["principles"]["A1"]["evidenced_outcomes"] == 2
        assert updated_data["objectives"]["A"]["evidenced_outcomes"] == 2
