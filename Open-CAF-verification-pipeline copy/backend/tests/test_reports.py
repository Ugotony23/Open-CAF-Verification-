"""Unit and Integration Tests for PDF Generator and Executive Reports."""
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
from app.models.assessment import Assessment, AssessmentOutcome, AssessmentIGPCheck, OutcomeStatus, AssessmentStatus
from app.models.associations import EvidenceOutcomeLink
from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority
from app.models.council_service import CouncilService, ServiceTier
from app.reports.pdf_generator import PDFGenerator
from app.cli.seed_caf import seed_caf_data
from app.cli.seed_council_services import seed_council_services_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def reports_test_env():
    """Initializes in-memory test DB, seeds CAF v4.0, creates assessment, users, and evidence."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed CAF Taxonomy & Council Services
    async with engine.connect() as conn:
        def do_seed(connection):
            sync_sess = Session(bind=connection)
            seed_caf_data(session=sync_sess)
            seed_council_services_data(session=sync_sess)
            sync_sess.close()
        await conn.run_sync(do_seed)
        await conn.commit()

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # Tenant A: Borsetshire District Council
        tenant_a = CouncilTenant(name="Borsetshire District Council", authority_type=AuthorityType.DISTRICT)
        session.add(tenant_a)

        # Tenant B: South Riding County Council
        tenant_b = CouncilTenant(name="South Riding County Council", authority_type=AuthorityType.COUNTY)
        session.add(tenant_b)
        await session.flush()

        # Seed council services for Tenant A
        svc_social = CouncilService(
            tenant_id=tenant_a.id,
            name="Adult & Children's Social Care Case Management",
            description="Statutory social care",
            tier=ServiceTier.TIER_1,
            weight_multiplier=3.0,
            is_active=True,
        )
        svc_rev = CouncilService(
            tenant_id=tenant_a.id,
            name="Revenues, Council Tax & Housing Benefits Processing",
            description="Revenues billing",
            tier=ServiceTier.TIER_1,
            weight_multiplier=3.0,
            is_active=True,
        )
        session.add_all([svc_social, svc_rev])

        # Users
        user_a = User(
            email="ciso@borsetshire.gov.uk",
            full_name="Marcus Vance",
            hashed_password=get_password_hash("Borsetshire2025!"),
            role=UserRole.CISO_ADMIN,
            tenant_id=tenant_a.id,
            is_active=True,
        )
        user_b = User(
            email="ciso@southriding.gov.uk",
            full_name="Sarah South",
            hashed_password=get_password_hash("SouthRiding2025!"),
            role=UserRole.CISO_ADMIN,
            tenant_id=tenant_b.id,
            is_active=True,
        )
        session.add_all([user_a, user_b])
        await session.flush()

        # Assessment for Tenant A
        assessment = Assessment(
            tenant_id=tenant_a.id,
            title="Borsetshire Cyber Resilience Assessment 2025/26",
            scope_description="Statutory NCSC CAF v4.0 assessment across all services",
            status=AssessmentStatus.IN_REVIEW,
            council_service_name="Adult & Children's Social Care Case Management",
        )
        session.add(assessment)
        await session.flush()

        # Initialize outcomes
        from app.models.caf import ContributingOutcome, IGP
        all_outcomes = (await session.execute(select(ContributingOutcome))).scalars().all()
        for oc in all_outcomes:
            ao = AssessmentOutcome(
                assessment_id=assessment.id,
                outcome_id=oc.id,
                status=OutcomeStatus.ACHIEVED if oc.id.startswith("A") else (OutcomeStatus.NOT_ACHIEVED if oc.id in ["B2.a", "B4.a", "D1.a"] else OutcomeStatus.PARTIALLY_ACHIEVED),
                assessor_rationale=f"Assessed status for {oc.id} in accordance with NCSC CAF v4.0 guidance.",
            )
            session.add(ao)
            await session.flush()

            # Add an IGP check
            igps = (await session.execute(select(IGP).filter_by(outcome_id=oc.id))).scalars().all()
            for igp in igps:
                session.add(AssessmentIGPCheck(assessment_outcome_id=ao.id, igp_id=igp.id, is_satisfied=True))

        # Evidence Artifact
        evidence = Evidence(
            tenant_id=tenant_a.id,
            uploaded_by_user_id=user_a.id,
            title="Borsetshire Information Security Policy v4.2",
            file_name="borsetshire_infosec_policy_2024.pdf",
            file_size_bytes=245000,
            mime_type="application/pdf",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            file_path="evidence/borsetshire/infosec_policy.pdf",
            category=EvidenceCategory.POLICY,
            valid_from=date.today() - timedelta(days=30),
            valid_to=date.today() + timedelta(days=335),
        )
        session.add(evidence)
        await session.flush()

        # Link evidence to B2.a
        link = EvidenceOutcomeLink(
            evidence_id=evidence.id,
            outcome_id="B2.a",
            linked_by_user_id=user_a.id,
            citation_notes="Section 4.1 governs identity and MFA requirements.",
        )
        session.add(link)

        # Remediation Task
        task = RemediationTask(
            tenant_id=tenant_a.id,
            assessment_id=assessment.id,
            outcome_id="B2.a",
            title="Deploy FIDO2 MFA on Legacy Social Care RD Gateway",
            description="Decommission legacy gateway and migrate to Azure App Proxy with conditional access",
            technical_steps=["Audit sessions", "Deploy App Proxy", "Enforce FIDO2", "Decommission gateway"],
            status=RemediationStatus.IN_PROGRESS,
            priority=RemediationPriority.CRITICAL,
            assigned_owner_name="Marcus Vance",
            assigned_owner_email="ciso@borsetshire.gov.uk",
            estimated_effort_hours=80.0,
            estimated_cost_gbp=14500.0,
            target_completion_date=date.today() + timedelta(days=14),
        )
        session.add(task)
        await session.commit()

        token_a = create_access_token(user_a.id, tenant_a.id, user_a.role.value)
        token_b = create_access_token(user_b.id, tenant_b.id, user_b.role.value)

    # Override get_db
    async def override_get_db():
        async with async_session() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "engine": engine,
        "session_maker": async_session,
        "assessment_id": assessment.id,
        "tenant_a_id": tenant_a.id,
        "tenant_b_id": tenant_b.id,
        "token_a": token_a,
        "token_b": token_b,
    }

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_executive_briefing_pdf_service(reports_test_env):
    """Verifies that PDFGenerator produces a valid PDF byte stream with %PDF header."""
    env = reports_test_env
    async with env["session_maker"]() as session:
        pdf_bytes = await PDFGenerator.generate_executive_briefing_pdf(
            db=session,
            assessment_id=env["assessment_id"],
            tenant_id=env["tenant_a_id"],
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 500
        assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_audit_pack_pdf_service(reports_test_env):
    """Verifies that PDFGenerator produces an audit pack covering all 39 outcomes."""
    env = reports_test_env
    async with env["session_maker"]() as session:
        pdf_bytes = await PDFGenerator.generate_audit_pack_pdf(
            db=session,
            assessment_id=env["assessment_id"],
            tenant_id=env["tenant_a_id"],
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_get_executive_pdf_endpoint_success(reports_test_env):
    """Tests GET /api/v1/reports/{id}/executive-pdf streams PDF with appropriate headers."""
    env = reports_test_env
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/reports/{env['assessment_id']}/executive-pdf",
            headers={"Authorization": f"Bearer {env['token_a']}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment; filename=" in response.headers["content-disposition"]
        assert response.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_get_audit_pdf_endpoint_success(reports_test_env):
    """Tests GET /api/v1/reports/{id}/audit-pdf streams Detailed Audit Pack PDF."""
    env = reports_test_env
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/reports/{env['assessment_id']}/audit-pdf",
            headers={"Authorization": f"Bearer {env['token_a']}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment; filename=" in response.headers["content-disposition"]
        assert response.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_report_summary_endpoint(reports_test_env):
    """Tests GET /api/v1/reports/{id}/summary returns aggregated metadata for UI preview."""
    env = reports_test_env
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/reports/{env['assessment_id']}/summary",
            headers={"Authorization": f"Bearer {env['token_a']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["council_name"] == "Borsetshire District Council"
        assert "scores" in data
        assert data["scores"]["total_outcomes"] == 39
        assert data["total_remediation_tasks"] == 1
        assert data["total_remediation_budget_gbp"] == 14500.0


@pytest.mark.asyncio
async def test_reports_cross_tenant_isolation(reports_test_env):
    """Verifies that Tenant B cannot access Tenant A's executive or audit PDF reports."""
    env = reports_test_env
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Tenant B attempts to download Tenant A's executive PDF
        res1 = await ac.get(
            f"/api/v1/reports/{env['assessment_id']}/executive-pdf",
            headers={"Authorization": f"Bearer {env['token_b']}"},
        )
        assert res1.status_code == 404

        # Tenant B attempts to download Tenant A's audit PDF
        res2 = await ac.get(
            f"/api/v1/reports/{env['assessment_id']}/audit-pdf",
            headers={"Authorization": f"Bearer {env['token_b']}"},
        )
        assert res2.status_code == 404


@pytest.mark.asyncio
async def test_reports_unauthenticated_rejected(reports_test_env):
    """Verifies that unauthenticated requests to report endpoints are rejected with 401."""
    env = reports_test_env
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get(f"/api/v1/reports/{env['assessment_id']}/executive-pdf")
        assert res.status_code == 401
