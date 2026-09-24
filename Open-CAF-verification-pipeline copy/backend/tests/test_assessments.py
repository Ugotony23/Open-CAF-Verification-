"""Unit & Integration Tests for Assessment Engine, Scoring & Outcomes."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.assessment import AssessmentStatus, OutcomeStatus
from app.cli.seed_caf import seed_caf_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def assessment_test_env():
    """Initializes in-memory test database, seeds CAF v4.0, and sets up council tenants."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Seed official CAF v4.0 data using the sync engine on the connection
        await conn.run_sync(lambda sync_conn: seed_caf_data(session=None) if False else None)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    # Seed CAF framework synchronously into DB
    from sqlalchemy.orm import Session
    async with engine.connect() as conn:
        def do_seed(connection):
            sync_sess = Session(bind=connection)
            seed_caf_data(session=sync_sess)
            sync_sess.close()
        await conn.run_sync(do_seed)
        await conn.commit()

    # Create Council Tenant A and Users
    async with async_session() as session:
        tenant_a = CouncilTenant(name="Borsetshire Council", authority_type=AuthorityType.DISTRICT)
        tenant_b = CouncilTenant(name="Southshire Council", authority_type=AuthorityType.COUNTY)
        session.add_all([tenant_a, tenant_b])
        await session.flush()

        ciso_a = User(
            tenant_id=tenant_a.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Alice CISO",
            role=UserRole.CISO_ADMIN,
            is_active=True
        )
        ciso_b = User(
            tenant_id=tenant_b.id,
            email="ciso@southshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Bob CISO",
            role=UserRole.CISO_ADMIN,
            is_active=True
        )
        session.add_all([ciso_a, ciso_b])
        await session.commit()

        token_a = create_access_token(ciso_a.id, tenant_a.id, ciso_a.role.value)
        token_b = create_access_token(ciso_b.id, tenant_b.id, ciso_b.role.value)
        tenant_a_id = tenant_a.id
        tenant_b_id = tenant_b.id

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "session": async_session,
        "token_a": token_a,
        "token_b": token_b,
        "tenant_a_id": tenant_a_id,
        "tenant_b_id": tenant_b_id,
    }

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_create_assessment_initializes_39_outcomes(assessment_test_env):
    """Verifies that creating an assessment pre-populates all 39 Contributing Outcomes in NOT_STARTED state."""
    token = assessment_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "2026 Annual Cyber Assurance",
            "scope_description": "Full council corporate estate, citizen revenues portal, and social care network.",
            "council_service_name": "Adult Social Care Systems"
        }
        res = await client.post(
            "/api/v1/assessments",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["title"] == payload["title"]
        assert data["status"] == "DRAFT"
        assessment_id = data["id"]

        # Fetch detailed assessment
        detail_res = await client.get(
            f"/api/v1/assessments/{assessment_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert len(detail_data["outcomes"]) == 39
        assert all(o["status"] == "NOT_STARTED" for o in detail_data["outcomes"])

        # Check an outcome's IGPs
        outcome_b2a = next(o for o in detail_data["outcomes"] if o["outcome_id"] == "B2.a")
        assert len(outcome_b2a["igp_checks"]) >= 2
        assert all(c["is_satisfied"] is False for c in outcome_b2a["igp_checks"])

@pytest.mark.asyncio
async def test_update_outcome_evaluation_and_score_recalculation(assessment_test_env):
    """Verifies updating an outcome status, checking IGPs, and recalculating scores."""
    token = assessment_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create assessment
        create_res = await client.post(
            "/api/v1/assessments",
            json={
                "title": "Q1 Assessment",
                "scope_description": "Electoral Services and Revenues IT",
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assessment_id = create_res.json()["id"]

        # 2. Get outcome B2.a details to find an IGP ID
        out_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/outcomes/B2.a",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert out_res.status_code == 200
        out_data = out_res.json()
        first_igp_id = out_data["igp_checks"][0]["igp_id"]

        # 3. Patch outcome evaluation: mark as ACHIEVED, record rationale and check IGP
        patch_payload = {
            "status": "ACHIEVED",
            "assessor_rationale": "Hardware security keys and conditional access enforced for 100% of council accounts.",
            "reviewer_notes": "Verified against Entra ID conditional access policy export.",
            "satisfied_igp_ids": [first_igp_id]
        }
        patch_res = await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/B2.a",
            json=patch_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert patch_res.status_code == 200
        patched_data = patch_res.json()
        assert patched_data["status"] == "ACHIEVED"
        assert patched_data["assessor_rationale"] == patch_payload["assessor_rationale"]
        assert patched_data["assessed_at"] is not None

        # Verify IGP check status updated
        checked_igp = next(c for c in patched_data["igp_checks"] if c["igp_id"] == first_igp_id)
        assert checked_igp["is_satisfied"] is True

        # 4. Check score summary
        score_res = await client.get(
            f"/api/v1/assessments/{assessment_id}/score-summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert score_res.status_code == 200
        scores = score_res.json()
        assert scores["total_outcomes"] == 39
        assert scores["evaluated_outcomes"] == 1
        assert scores["remaining_outcomes"] == 38
        assert scores["overall_achieved_count"] == 1
        assert scores["completion_rate"] == round((1 / 39) * 100, 1)

        # Objective B breakdown should reflect 1 achieved
        assert scores["objectives"]["B"]["achieved"] == 1
        assert scores["objectives"]["B"]["total_outcomes"] == 20
        assert scores["objectives"]["B"]["principles"]["B2"]["achieved"] == 1

@pytest.mark.asyncio
async def test_tenant_isolation_on_assessments(assessment_test_env):
    """Verifies that Council Tenant B cannot read or edit Council Tenant A's assessment."""
    token_a = assessment_test_env["token_a"]
    token_b = assessment_test_env["token_b"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Tenant A creates assessment
        create_res = await client.post(
            "/api/v1/assessments",
            json={
                "title": "Borsetshire Internal Assessment",
                "scope_description": "Confidential internal IT infrastructure",
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assessment_id = create_res.json()["id"]

        # Tenant B attempts to read Tenant A's assessment -> 404
        read_res = await client.get(
            f"/api/v1/assessments/{assessment_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert read_res.status_code == 404

        # Tenant B attempts to patch Tenant A's outcome -> 404
        patch_res = await client.patch(
            f"/api/v1/assessments/{assessment_id}/outcomes/B2.a",
            json={"status": "ACHIEVED"},
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert patch_res.status_code == 404
