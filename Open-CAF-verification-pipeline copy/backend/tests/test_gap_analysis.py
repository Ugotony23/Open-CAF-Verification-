"""Unit & Integration Tests for Deficit & Evidential Gap Detection Engine."""
import io
import pytest
from datetime import datetime, timezone, date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.assessment import OutcomeStatus
from app.models.evidence import EvidenceCategory
from app.schemas.assessment import AssessmentCreate, OutcomeEvaluationUpdate
from app.services.assessment_service import AssessmentService
from app.cli.seed_caf import seed_caf_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def gap_test_env():
    """Initializes in-memory test DB, seeds CAF v4.0 taxonomy, and creates a council tenant."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed CAF taxonomy
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

        ciso = User(
            tenant_id=tenant.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Arthur Pendelton",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        session.add(ciso)
        await session.commit()

        token = create_access_token(ciso.id, tenant.id, ciso.role.value)
        tenant_id = tenant.id

        # Create assessment
        assessment = await AssessmentService.create_assessment(
            session,
            tenant_id,
            AssessmentCreate(
                title="Borsetshire Annual Assurance Audit 2026",
                scope_description="Council-wide corporate and citizen infrastructure",
            ),
        )
        assessment_id = assessment.id

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "token": token,
        "tenant_id": tenant_id,
        "assessment_id": assessment_id,
        "session_factory": async_session,
    }

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_evidential_gap_detection_for_unverified_achieved_outcome(gap_test_env):
    """Verifies that an outcome marked Achieved without evidence returns an Evidential Gap."""
    token = gap_test_env["token"]
    assessment_id = gap_test_env["assessment_id"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Update outcome A1.a to ACHIEVED with no evidence attached
        patch_res = await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/A1.a",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "status": "ACHIEVED",
                "assessor_rationale": "Board has regular cyber risk oversight and strategy reviews.",
            },
        )
        assert patch_res.status_code == 200

        # 2. Query gaps
        gaps_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/gaps",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gaps_res.status_code == 200
        gaps = gaps_res.json()

        # Find gap for A1.a
        a1a_gaps = [g for g in gaps if g["outcome_id"] == "A1.a"]
        assert len(a1a_gaps) == 1
        gap = a1a_gaps[0]
        assert gap["gap_type"] == "EVIDENTIAL_GAP"
        assert "Evidential Blindspot on A1.a" in gap["title"]
        assert gap["evaluated_status"] == "ACHIEVED"
        assert gap["evidence_count"] == 0

        # 3. Now upload and link fresh evidence to A1.a
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("Board_Minutes_2026.pdf", io.BytesIO(b"Minutes"), "application/pdf")},
            data={"title": "Board Cyber Minutes Q1", "category": "AUDIT_LOG"},
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        link_res = await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={"outcome_id": "A1.a", "citation_notes": "Paragraph 4.2"},
        )
        assert link_res.status_code == 201

        # 4. Re-query gaps - Evidential gap for A1.a should now be resolved!
        gaps_after = await client.get(
            f"/api/v1/assessments/{assessment_id}/gaps",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gaps_after.status_code == 200
        remaining_a1a_gaps = [g for g in gaps_after.json() if g["outcome_id"] == "A1.a"]
        assert len(remaining_a1a_gaps) == 0

@pytest.mark.asyncio
async def test_control_deficit_detection_and_critical_severity_weighting(gap_test_env):
    """Verifies that an outcome marked NOT_ACHIEVED creates a CONTROL_DEFICIT with CRITICAL severity on B2."""
    token = gap_test_env["token"]
    assessment_id = gap_test_env["assessment_id"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mark B2.b (Privileged Access) as NOT_ACHIEVED
        patch_res = await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/B2.b",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "status": "NOT_ACHIEVED",
                "assessor_rationale": "Admin credentials are shared and MFA is not enforced on Domain Controllers.",
            },
        )
        assert patch_res.status_code == 200

        # Query gaps
        gaps_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/gaps?gap_type=CONTROL_DEFICIT",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gaps_res.status_code == 200
        gaps = gaps_res.json()

        b2b_gaps = [g for g in gaps if g["outcome_id"] == "B2.b"]
        assert len(b2b_gaps) == 1
        gap = b2b_gaps[0]

        assert gap["gap_type"] == "CONTROL_DEFICIT"
        assert gap["severity"] == "CRITICAL"  # B2 principle has CRITICAL weighting
        assert gap["principle_id"] == "B2"
        assert gap["objective_id"] == "B"
        assert len(gap["unmet_igps"]) > 0

@pytest.mark.asyncio
async def test_stale_evidence_triggers_evidential_gap(gap_test_env):
    """Verifies that an outcome with only expired/stale evidence triggers an Evidential Gap."""
    token = gap_test_env["token"]
    assessment_id = gap_test_env["assessment_id"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Mark B1.a as ACHIEVED
        await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/B1.a",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "ACHIEVED"},
        )

        # 2. Upload an evidence file with valid_to in the past
        past_date = (datetime.now(timezone.utc).date() - timedelta(days=30)).isoformat()
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("Old_Policy_2023.pdf", io.BytesIO(b"Outdated"), "application/pdf")},
            data={
                "title": "Expired Security Policy",
                "category": "POLICY",
                "valid_to": past_date,
            },
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        # 3. Link the expired evidence to B1.a
        await client.post(
            f"/api/v1/evidence/{evidence_id}/link",
            headers={"Authorization": f"Bearer {token}"},
            json={"outcome_id": "B1.a"},
        )

        # 4. Check that B1.a still triggers an EVIDENTIAL_GAP because evidence is stale
        gaps_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/gaps",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gaps_res.status_code == 200
        b1a_gaps = [g for g in gaps_res.json() if g["outcome_id"] == "B1.a"]
        assert len(b1a_gaps) == 1
        assert b1a_gaps[0]["gap_type"] == "EVIDENTIAL_GAP"
        assert b1a_gaps[0]["is_stale_evidence"] is True

@pytest.mark.asyncio
async def test_gap_summary_aggregation(gap_test_env):
    """Verifies that the /gaps/summary endpoint aggregates counts and hierarchies accurately."""
    token = gap_test_env["token"]
    assessment_id = gap_test_env["assessment_id"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create 1 Evidential Gap (A1.a Achieved without proof)
        await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/A1.a",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "ACHIEVED"},
        )
        # Create 1 Control Deficit (B2.b Not Achieved)
        await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/B2.b",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "NOT_ACHIEVED"},
        )

        summary_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/gaps/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert summary_res.status_code == 200
        summary = summary_res.json()

        assert summary["evidential_gaps_count"] >= 1
        assert summary["control_deficits_count"] >= 1
        assert summary["total_gaps"] >= 2
        assert "CRITICAL" in summary["by_severity"]
        assert summary["by_severity"]["CRITICAL"] >= 1
        assert "A" in summary["by_objective"]
        assert "B" in summary["by_objective"]
