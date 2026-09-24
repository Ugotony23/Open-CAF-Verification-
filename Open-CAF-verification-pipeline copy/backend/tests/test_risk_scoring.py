"""Unit & Integration Tests for Risk Prioritization Algorithm (Council Impact Matrix)."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.council_service import ServiceTier
from app.models.assessment import OutcomeStatus
from app.schemas.gap import GapItem, GapTypeEnum, GapSeverityEnum
from app.schemas.risk import RiskLevelEnum
from app.schemas.assessment import AssessmentCreate, OutcomeEvaluationUpdate
from app.services.risk_scoring_service import RiskScoringService
from app.services.assessment_service import AssessmentService
from app.cli.seed_caf import seed_caf_data
from app.cli.seed_council_services import seed_council_services_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# ==============================================================================
# Pure Unit Tests: Formula & Scoring Factors
# ==============================================================================

def test_risk_formula_tier_1_social_care_vs_tier_3_public_wifi():
    """
    CRITICAL ACCEPTANCE TEST:
    Asserts that a gap affecting Social Care (Tier 1, weight 3.0)
    produces a significantly higher priority score than the exact same gap
    affecting Public Wi-Fi (Tier 3, weight 1.0).
    """
    gap_severity = 5  # Material technical deficit in B2 (MFA absence)
    threat_likelihood = 3  # Ransomware / Phishing vector

    # Social Care (Tier 1)
    social_care_weight = 3.0
    score_sc, level_sc, sla_sc, label_sc = RiskScoringService.calculate_risk_score(
        gap_severity=gap_severity,
        service_weight=social_care_weight,
        threat_likelihood=threat_likelihood,
    )

    # Public Wi-Fi (Tier 3)
    public_wifi_weight = 1.0
    score_wifi, level_wifi, sla_wifi, label_wifi = RiskScoringService.calculate_risk_score(
        gap_severity=gap_severity,
        service_weight=public_wifi_weight,
        threat_likelihood=threat_likelihood,
    )

    # Assertions
    assert score_sc > score_wifi, f"Expected Social Care ({score_sc}) > Public Wi-Fi ({score_wifi})"
    assert score_sc == 100.0
    assert level_sc == RiskLevelEnum.CRITICAL
    assert sla_sc == 14
    assert label_sc == "14 days"

    assert score_wifi == 33.3
    assert level_wifi == RiskLevelEnum.MEDIUM
    assert sla_wifi == 90
    assert label_wifi == "90 days"


def test_risk_scoring_slas_and_thresholds():
    """Verifies score normalization (0-100), thresholds, and SLA assignments."""
    # Critical: >= 75 -> 14 days
    score, level, sla, label = RiskScoringService.calculate_risk_score(5, 3.0, 3)
    assert score == 100.0 and level == RiskLevelEnum.CRITICAL and sla == 14

    # High: 50 - 74 -> 45 days (e.g. Gap 5, Tier 2 weight 2.0, Likelihood 3 -> 30/45 = 66.7)
    score_h, level_h, sla_h, label_h = RiskScoringService.calculate_risk_score(5, 2.0, 3)
    assert score_h == 66.7 and level_h == RiskLevelEnum.HIGH and sla_h == 45

    # Medium: 25 - 49 -> 90 days (e.g. Gap 4, Tier 2 weight 2.0, Likelihood 2 -> 16/45 = 35.6)
    score_m, level_m, sla_m, label_m = RiskScoringService.calculate_risk_score(4, 2.0, 2)
    assert score_m == 35.6 and level_m == RiskLevelEnum.MEDIUM and sla_m == 90

    # Low: < 25 -> 180 days (e.g. Gap 2, Tier 3 weight 1.0, Likelihood 1 -> 2/45 = 4.4)
    score_l, level_l, sla_l, label_l = RiskScoringService.calculate_risk_score(2, 1.0, 1)
    assert score_l == 4.4 and level_l == RiskLevelEnum.LOW and sla_l == 180


def test_threat_likelihood_factor_mapping():
    """Verifies that high-risk council threat vectors receive Likelihood 3."""
    # Active council attack vectors: B2 (Phishing), B4 (Edge VPN), B5 (Ransomware), D1 (Incident crisis)
    for p in ["B2", "B4", "B5", "D1"]:
        score, vector = RiskScoringService.get_threat_likelihood(p, GapTypeEnum.CONTROL_DEFICIT)
        assert score == 3
        assert "High prevalence" in vector or "Active targeting" in vector or "Ransomware" in vector

    # Moderate vectors: B3, C1, C2, A4
    for p in ["B3", "C1", "C2", "A4"]:
        score, vector = RiskScoringService.get_threat_likelihood(p, GapTypeEnum.CONTROL_DEFICIT)
        assert score == 2

    # Baseline governance: A1, A2, A3, D2
    for p in ["A1", "A2", "A3", "D2"]:
        score, vector = RiskScoringService.get_threat_likelihood(p, GapTypeEnum.CONTROL_DEFICIT)
        assert score == 1


# ==============================================================================
# Integration Tests: Assessment Risk Prioritization API
# ==============================================================================

@pytest.fixture(scope="function")
async def risk_test_env():
    """Initializes in-memory test DB, seeds CAF v4.0, Council Services, and creates test assessment."""
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

        # Seed council services for Tenant A
        async with engine.connect() as conn:
            def do_seed_services(connection):
                sync_sess = Session(bind=connection)
                seed_council_services_data(session=sync_sess, tenant_id=tenant_a.id)
                sync_sess.close()
            await conn.run_sync(do_seed_services)
            await conn.commit()

        # CISO User in Tenant A
        ciso = User(
            tenant_id=tenant_a.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Arthur Pendelton",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        # User in Tenant B
        user_b = User(
            tenant_id=tenant_b.id,
            email="admin@barsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Diane Prince",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        session.add_all([ciso, user_b])
        await session.commit()

        token_a = create_access_token(ciso.id, tenant_a.id, ciso.role.value)
        token_b = create_access_token(user_b.id, tenant_b.id, user_b.role.value)

        # Create Assessment for Tenant A
        assessment_a = await AssessmentService.create_assessment(
            db=session,
            tenant_id=tenant_a.id,
            payload=AssessmentCreate(
                title="Q3 2026 Statutory CAF Audit",
                scope_description="Full Council Cyber Perimeter Review",
            ),
        )
        assessment_a_id = assessment_a.id

        # Update B2.a (Identity) to NOT_ACHIEVED (Critical Deficit)
        await AssessmentService.update_outcome_evaluation(
            db=session,
            assessment_id=assessment_a_id,
            outcome_id="B2.a",
            payload=OutcomeEvaluationUpdate(
                status=OutcomeStatus.NOT_ACHIEVED,
                assessor_rationale="Legacy domain controllers lack multi-factor authentication for privileged administrative access.",
                satisfied_igp_ids=[],
            ),
            tenant_id=tenant_a.id,
        )

        # Update A1.a (Governance) to ACHIEVED without evidence (Evidential Gap)
        await AssessmentService.update_outcome_evaluation(
            db=session,
            assessment_id=assessment_a_id,
            outcome_id="A1.a",
            payload=OutcomeEvaluationUpdate(
                status=OutcomeStatus.ACHIEVED,
                assessor_rationale="Governance policy exists on intranet, but no formal signed approval artifact uploaded.",
                satisfied_igp_ids=[],
            ),
            tenant_id=tenant_a.id,
        )

    async def override_get_db():
        async with async_session() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "engine": engine,
        "tenant_a_id": tenant_a.id,
        "tenant_b_id": tenant_b.id,
        "assessment_id": assessment_a_id,
        "token_a": token_a,
        "token_b": token_b,
    }

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_prioritized_risks_descending_sort_and_tiers(risk_test_env):
    """
    Verifies that GET /api/v1/assessments/{id}/prioritized-risks:
    1. Returns risks ranked strictly in descending priority score order.
    2. Ranks B2.a impacting Tier 1 services (Score 100.0) at the very top (Rank 1).
    3. Correctly calculates affected Tier 1 services and 3x3 heatmap coordinates.
    """
    env = risk_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(f"/api/v1/assessments/{ass_id}/prioritized-risks", headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["total_risks"] > 0
        assert data["critical_risks_count"] >= 1
        assert data["affected_tier_1_services_count"] >= 1

        risks = data["risks"]
        # Assert strict descending order by priority_score
        scores = [r["priority_score"] for r in risks]
        assert scores == sorted(scores, reverse=True), "Risks are not sorted descending by priority score"

        # Assert rank numbers are 1, 2, 3...
        for idx, r in enumerate(risks, start=1):
            assert r["rank"] == idx

        # The #1 top risk MUST be the B2.a deficit impacting a Tier 1 service
        top_risk = risks[0]
        assert top_risk["outcome_id"] == "B2.a"
        assert top_risk["impacted_service_tier"] == "TIER_1"
        assert top_risk["priority_score"] == 100.0
        assert top_risk["risk_level"] == "CRITICAL"
        assert top_risk["suggested_sla_days"] == 14
        assert top_risk["suggested_sla_label"] == "14 days"

        # Check 3x3 heatmap coordinates are populated
        heatmap = data["heatmap_distribution"]
        assert "L3_I3" in heatmap  # Likelihood 3, Impact 3 (Tier 1)
        assert heatmap["L3_I3"] > 0


@pytest.mark.asyncio
async def test_filter_prioritized_risks_by_tier_and_level(risk_test_env):
    """Verifies query filters by service criticality tier and risk level."""
    env = risk_test_env
    headers = {"Authorization": f"Bearer {env['token_a']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Filter Tier 1 only
        resp_t1 = await ac.get(
            f"/api/v1/assessments/{ass_id}/prioritized-risks?tier=TIER_1",
            headers=headers,
        )
        assert resp_t1.status_code == 200
        data_t1 = resp_t1.json()
        assert all(r["impacted_service_tier"] == "TIER_1" for r in data_t1["risks"])

        # Filter Critical risk level only
        resp_crit = await ac.get(
            f"/api/v1/assessments/{ass_id}/prioritized-risks?risk_level=CRITICAL",
            headers=headers,
        )
        assert resp_crit.status_code == 200
        data_crit = resp_crit.json()
        assert all(r["risk_level"] == "CRITICAL" for r in data_crit["risks"])


@pytest.mark.asyncio
async def test_tenant_isolation_on_prioritized_risks(risk_test_env):
    """Verifies that Tenant B cannot access Tenant A's prioritized risks."""
    env = risk_test_env
    headers_b = {"Authorization": f"Bearer {env['token_b']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            f"/api/v1/assessments/{ass_id}/prioritized-risks",
            headers=headers_b,
        )
        # Should return 404 because assessment belongs to Tenant A
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_prioritized_risks_rejected(risk_test_env):
    """Verifies that missing JWT token returns 401."""
    env = risk_test_env
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(f"/api/v1/assessments/{ass_id}/prioritized-risks")
        assert resp.status_code == 401
