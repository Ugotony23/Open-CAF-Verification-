"""Unit and Integration Tests for AI Copilot Assistant & Human-in-the-Loop Guardrails."""
import pytest
from uuid import uuid4
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.evidence import Evidence, EvidenceCategory
from app.models.assessment import Assessment, AssessmentOutcome, OutcomeStatus
from app.models.associations import EvidenceOutcomeLink
from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority
from app.models.ai_suggestion import AISuggestion, SuggestionType, SuggestionStatus
from app.schemas.assessment import AssessmentCreate
from app.services.assessment_service import AssessmentService
from app.cli.seed_caf import seed_caf_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def copilot_test_env():
    """Initializes in-memory test DB, seeds CAF v4.0, creates assessment, users, and evidence."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed CAF Taxonomy
    async with engine.connect() as conn:
        def do_seed_caf(connection):
            sync_sess = Session(bind=connection)
            seed_caf_data(session=sync_sess)
            sync_sess.close()
        await conn.run_sync(do_seed_caf)
        await conn.commit()

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # Tenant A: Borsetshire Council
        tenant_a = CouncilTenant(name="Borsetshire Council", authority_type=AuthorityType.UNITARY)
        session.add(tenant_a)

        # Tenant B: Barsetshire County
        tenant_b = CouncilTenant(name="Barsetshire County", authority_type=AuthorityType.COUNTY)
        session.add(tenant_b)
        await session.flush()

        # Users
        ciso_a = User(
            tenant_id=tenant_a.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Arthur CISO",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        ciso_b = User(
            tenant_id=tenant_b.id,
            email="ciso@barsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Boris CISO",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        session.add_all([ciso_a, ciso_b])
        await session.flush()

        # Create Assessment in Tenant A
        ass = await AssessmentService.create_assessment(
            db=session,
            tenant_id=tenant_a.id,
            payload=AssessmentCreate(
                title="Borsetshire 2026 Resilience Assessment",
                scope_description="All statutory and corporate council digital services",
                council_service_name="Adult Social Care & Revenues",
            ),
        )

        # Create Evidence in Tenant A
        evidence_item = Evidence(
            tenant_id=tenant_a.id,
            title="Council Identity and Multi-Factor Authentication Policy v2.4",
            description="Defines credential criteria, password complexities, and administrative multi-factor authentication (MFA).",
            category=EvidenceCategory.POLICY,
            file_path="/evidence/mfa_policy.pdf",
            file_name="mfa_policy.pdf",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_by_user_id=ciso_a.id,
        )
        session.add(evidence_item)
        await session.commit()

        token_a = create_access_token(ciso_a.id, tenant_a.id, ciso_a.role.value)
        token_b = create_access_token(ciso_b.id, tenant_b.id, ciso_b.role.value)

        env = {
            "session_factory": async_session,
            "tenant_a_id": tenant_a.id,
            "tenant_b_id": tenant_b.id,
            "assessment_id": ass.id,
            "evidence_id": evidence_item.id,
            "token_a": token_a,
            "token_b": token_b,
        }

    async def override_get_db():
        async with async_session() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    yield env
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_suggest_evidence_mappings_citations_and_pending_status(copilot_test_env):
    """
    Verifies that suggest_evidence_mappings:
    1. Returns top outcome candidates with citation quotes and confidence scores.
    2. Suggestion status starts in PENDING_REVIEW.
    3. Human-in-the-Loop check: NO EvidenceOutcomeLink is created until user accepts.
    """
    env = copilot_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ev_id = env["evidence_id"]
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            f"/api/v1/ai/suggest-mappings/{ev_id}",
            json={"assessment_id": str(ass_id)},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["suggestion_type"] == "EVIDENCE_MAPPING"
        assert data["status"] == "PENDING_REVIEW"
        assert data["outcome_id"] == "B2.a"
        assert data["confidence_score"] >= 0.70
        assert len(data["citation_quotes"]) > 0
        assert "Multi-factor authentication" in data["citation_quotes"][0]

        # Critical Human-in-the-Loop Guardrail Verification:
        # Verify that evidence is NOT yet linked in the database!
        async with env["session_factory"]() as db:
            links_res = await db.execute(select(EvidenceOutcomeLink).filter_by(evidence_id=ev_id))
            links = links_res.scalars().all()
            assert len(links) == 0, "No link should exist before user accepts the suggestion!"


@pytest.mark.asyncio
async def test_critique_outcome_gap_pending_status(copilot_test_env):
    """
    Verifies that critique_outcome_gap:
    1. Evaluates outcome requirements against IGPs.
    2. Suggestion status starts in PENDING_REVIEW.
    3. Human-in-the-Loop check: Assessor rationale is NOT modified until accepted.
    """
    env = copilot_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/ai/critique-gap",
            json={"assessment_id": str(ass_id), "outcome_id": "B2.a"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["suggestion_type"] == "GAP_CRITIQUE"
        assert data["status"] == "PENDING_REVIEW"
        assert "B2.a" in data["title"]
        assert "NCSC CAF Outcome B2.a" in data["summary"]
        assert len(data["citation_quotes"]) > 0

        # Human-in-the-loop: Verify assessment outcome rationale is unchanged
        async with env["session_factory"]() as db:
            out_res = await db.execute(
                select(AssessmentOutcome).filter_by(assessment_id=ass_id, outcome_id="B2.a")
            )
            out = out_res.scalars().first()
            assert out.assessor_rationale is None or "[AI Copilot Assessor Critique]" not in out.assessor_rationale


@pytest.mark.asyncio
async def test_draft_remediation_action_pending_status(copilot_test_env):
    """
    Verifies that draft_remediation:
    1. Proposes title, technical checklist steps, effort hours, and cost.
    2. Suggestion status starts in PENDING_REVIEW.
    3. Human-in-the-Loop check: NO RemediationTask is created in the database yet.
    """
    env = copilot_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/ai/draft-remediation",
            json={"assessment_id": str(ass_id), "gap_id": "gap-demo-b2a", "outcome_id": "B2.a"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["suggestion_type"] == "REMEDIATION_ACTION"
        assert data["status"] == "PENDING_REVIEW"
        assert "FIDO2" in data["title"] or "MFA" in data["title"]

        payload = data["payload"]
        assert "technical_steps" in payload
        assert len(payload["technical_steps"]) > 0
        assert payload["estimated_effort_hours"] > 0
        assert payload["estimated_cost_gbp"] > 0

        # Human-in-the-loop: Verify no remediation task was created yet
        async with env["session_factory"]() as db:
            tasks_res = await db.execute(select(RemediationTask).filter_by(assessment_id=ass_id))
            tasks = tasks_res.scalars().all()
            assert len(tasks) == 0, "No RemediationTask should be created before explicit user acceptance!"


@pytest.mark.asyncio
async def test_accept_suggestion_applies_data(copilot_test_env):
    """
    Verifies that when a user calls POST /suggestions/{id}/accept:
    1. Suggestion status updates to ACCEPTED.
    2. Live records are created/modified based on suggestion type:
       - EVIDENCE_MAPPING -> Creates EvidenceOutcomeLink
       - GAP_CRITIQUE -> Updates AssessmentOutcome.assessor_rationale
       - REMEDIATION_ACTION -> Creates RemediationTask
    """
    env = copilot_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]
    ev_id = env["evidence_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Test Accept Evidence Mapping
        sugg_mapping = (await ac.post(
            f"/api/v1/ai/suggest-mappings/{ev_id}",
            json={"assessment_id": str(ass_id)},
            headers=headers,
        )).json()
        s_id_1 = sugg_mapping["id"]

        accept_resp_1 = await ac.post(f"/api/v1/ai/suggestions/{s_id_1}/accept", headers=headers)
        assert accept_resp_1.status_code == 200
        assert accept_resp_1.json()["status"] == "ACCEPTED"

        # Verify link now exists in database
        async with env["session_factory"]() as db:
            links = (await db.execute(select(EvidenceOutcomeLink).filter_by(evidence_id=ev_id))).scalars().all()
            assert len(links) == 1
            assert links[0].outcome_id == "B2.a"
            assert "[AI Copilot Approved]" in links[0].citation_notes

        # 2. Test Accept Gap Critique
        sugg_critique = (await ac.post(
            "/api/v1/ai/critique-gap",
            json={"assessment_id": str(ass_id), "outcome_id": "B2.a"},
            headers=headers,
        )).json()
        s_id_2 = sugg_critique["id"]

        accept_resp_2 = await ac.post(f"/api/v1/ai/suggestions/{s_id_2}/accept", headers=headers)
        assert accept_resp_2.status_code == 200

        # Verify outcome rationale updated
        async with env["session_factory"]() as db:
            out = (await db.execute(
                select(AssessmentOutcome).filter_by(assessment_id=ass_id, outcome_id="B2.a")
            )).scalars().first()
            assert "[AI Copilot Assessor Critique]" in out.assessor_rationale

        # 3. Test Accept Remediation Action
        sugg_action = (await ac.post(
            "/api/v1/ai/draft-remediation",
            json={"assessment_id": str(ass_id), "gap_id": "gap-demo-b2a", "outcome_id": "B2.a"},
            headers=headers,
        )).json()
        s_id_3 = sugg_action["id"]

        accept_resp_3 = await ac.post(f"/api/v1/ai/suggestions/{s_id_3}/accept", headers=headers)
        assert accept_resp_3.status_code == 200

        # Verify RemediationTask now created
        async with env["session_factory"]() as db:
            tasks = (await db.execute(select(RemediationTask).filter_by(assessment_id=ass_id))).scalars().all()
            assert len(tasks) == 1
            assert tasks[0].outcome_id == "B2.a"
            assert tasks[0].estimated_cost_gbp > 0


@pytest.mark.asyncio
async def test_reject_suggestion_leaves_assessment_untouched(copilot_test_env):
    """
    Verifies that when a user calls POST /suggestions/{id}/reject:
    1. Suggestion status becomes REJECTED.
    2. No live assessment, evidence, or remediation records are created.
    """
    env = copilot_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        sugg = (await ac.post(
            "/api/v1/ai/draft-remediation",
            json={"assessment_id": str(ass_id), "gap_id": "gap-demo-b2a", "outcome_id": "B2.a"},
            headers=headers,
        )).json()

        reject_resp = await ac.post(
            f"/api/v1/ai/suggestions/{sugg['id']}/reject",
            json={"rejection_reason": "Cost estimate exceeds current departmental budget allocation."},
            headers=headers,
        )
        assert reject_resp.status_code == 200
        assert reject_resp.json()["status"] == "REJECTED"

        # Verify no task was created
        async with env["session_factory"]() as db:
            tasks = (await db.execute(select(RemediationTask).filter_by(assessment_id=ass_id))).scalars().all()
            assert len(tasks) == 0


@pytest.mark.asyncio
async def test_copilot_tenant_isolation(copilot_test_env):
    """Verifies that Council Tenant B cannot view, accept, or reject Tenant A's AI suggestions."""
    env = copilot_test_env
    headers_a = {"Authorization": f"Bearer {env['token_a']}"}
    headers_b = {"Authorization": f"Bearer {env['token_b']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create suggestion in Tenant A
        sugg = (await ac.post(
            "/api/v1/ai/critique-gap",
            json={"assessment_id": str(ass_id), "outcome_id": "B2.a"},
            headers=headers_a,
        )).json()

        # Tenant B tries to get suggestion
        resp_get = await ac.get(f"/api/v1/ai/suggestions/{sugg['id']}", headers=headers_b)
        assert resp_get.status_code == 404

        # Tenant B tries to accept suggestion
        resp_acc = await ac.post(f"/api/v1/ai/suggestions/{sugg['id']}/accept", headers=headers_b)
        assert resp_acc.status_code == 404


@pytest.mark.asyncio
async def test_copilot_unauthenticated_rejected(copilot_test_env):
    """Verifies unauthenticated access to AI endpoints is rejected with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/ai/suggestions")
        assert resp.status_code == 401
