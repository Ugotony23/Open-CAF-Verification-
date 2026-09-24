"""Unit & Integration Tests for Remediation Task Management Engine."""
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.assessment import OutcomeStatus
from app.models.remediation import RemediationStatus, RemediationPriority
from app.schemas.assessment import AssessmentCreate, OutcomeEvaluationUpdate
from app.services.assessment_service import AssessmentService
from app.cli.seed_caf import seed_caf_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def remediation_test_env():
    """Initializes in-memory test DB, seeds CAF v4.0, creates assessment and users."""
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

        # CISO User in Tenant A
        ciso = User(
            tenant_id=tenant_a.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Arthur Pendelton",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        # Assessor User in Tenant A
        assessor = User(
            tenant_id=tenant_a.id,
            email="assessor@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Beatrice Assessor",
            role=UserRole.SECURITY_ASSESSOR,
            is_active=True,
        )
        # Auditor User in Tenant A (read-only)
        auditor = User(
            tenant_id=tenant_a.id,
            email="auditor@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Charles Auditor",
            role=UserRole.AUDITOR,
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
        session.add_all([ciso, assessor, auditor, user_b])
        await session.commit()

        token_ciso = create_access_token(ciso.id, tenant_a.id, ciso.role.value)
        token_assessor = create_access_token(assessor.id, tenant_a.id, assessor.role.value)
        token_auditor = create_access_token(auditor.id, tenant_a.id, auditor.role.value)
        token_b = create_access_token(user_b.id, tenant_b.id, user_b.role.value)

        # Create Assessment for Tenant A
        assessment_a = await AssessmentService.create_assessment(
            db=session,
            tenant_id=tenant_a.id,
            payload=AssessmentCreate(
                title="Q3 2026 Statutory CAF Audit",
                scope_description="Council Corporate & Citizen Infrastructure",
            ),
        )
        assessment_a_id = assessment_a.id

        # Update B2.a to NOT_ACHIEVED (Critical Deficit)
        await AssessmentService.update_outcome_evaluation(
            db=session,
            assessment_id=assessment_a_id,
            outcome_id="B2.a",
            payload=OutcomeEvaluationUpdate(
                status=OutcomeStatus.NOT_ACHIEVED,
                assessor_rationale="Legacy remote access endpoints lack mandatory multi-factor authentication.",
                satisfied_igp_ids=[],
            ),
            tenant_id=tenant_a.id,
        )

        # Update A1.a to ACHIEVED with no evidence (Evidential Gap)
        await AssessmentService.update_outcome_evaluation(
            db=session,
            assessment_id=assessment_a_id,
            outcome_id="A1.a",
            payload=OutcomeEvaluationUpdate(
                status=OutcomeStatus.ACHIEVED,
                assessor_rationale="Policy documented on intranet but no annual signed review uploaded.",
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
        "token_ciso": token_ciso,
        "token_assessor": token_assessor,
        "token_auditor": token_auditor,
        "token_b": token_b,
    }

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_create_task_from_gap_auto_populates_data(remediation_test_env):
    """Verifies that creating a task from an identified gap auto-populates SLA, priority, and budget."""
    env = remediation_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "assessment_id": str(ass_id),
            "outcome_id": "B2.a",
            "assigned_owner_name": "DevSecOps Team Lead",
            "assigned_owner_email": "devsecops@borsetshire.gov.uk",
            "external_ticket_id": "JIRA-CYBER-104",
        }
        resp = await ac.post("/api/v1/remediation/tasks/from-gap", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()

        assert data["outcome_id"] == "B2.a"
        assert data["status"] == "BACKLOG"
        assert data["priority"] == "CRITICAL"
        assert data["estimated_cost_gbp"] == 12500.0
        assert data["estimated_effort_hours"] == 80.0
        assert data["assigned_owner_name"] == "DevSecOps Team Lead"
        assert data["external_ticket_id"] == "JIRA-CYBER-104"
        assert len(data["technical_steps"]) > 0

        # Verify target SLA: 14 days from today
        expected_date = (date.today() + timedelta(days=14)).isoformat()
        assert data["target_completion_date"] == expected_date
        assert data["completed_at"] is None


@pytest.mark.asyncio
async def test_create_manual_remediation_task(remediation_test_env):
    """Verifies manual task creation with custom technical steps checklist."""
    env = remediation_test_env
    headers = {"Authorization": f"Bearer {env['token_assessor']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "assessment_id": str(ass_id),
            "outcome_id": "B4.a",
            "title": "Upgrade Internet-Facing Edge Firewalls to v12.4 LTS",
            "description": "Remediate zero-day edge gateway vulnerabilities and configure strict ingress filter rules.",
            "technical_steps": [
                {"step": "Schedule change window", "completed": True},
                {"step": "Backup configuration state", "completed": False},
                {"step": "Apply firmware update and test failover", "completed": False},
            ],
            "priority": "HIGH",
            "estimated_effort_hours": 32.0,
            "estimated_cost_gbp": 4800.0,
            "target_completion_date": (date.today() + timedelta(days=30)).isoformat(),
        }
        resp = await ac.post("/api/v1/remediation/tasks", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()

        assert data["title"] == payload["title"]
        assert data["priority"] == "HIGH"
        assert data["estimated_cost_gbp"] == 4800.0
        assert len(data["technical_steps"]) == 3


@pytest.mark.asyncio
async def test_update_task_status_auto_sets_completed_at(remediation_test_env):
    """Verifies status transitions and auto-setting/clearing of completed_at timestamp."""
    env = remediation_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a task
        create_resp = await ac.post(
            "/api/v1/remediation/tasks",
            json={
                "assessment_id": str(ass_id),
                "outcome_id": "A1.a",
                "title": "Ratify Annual Cyber Security Strategy with Cabinet",
                "priority": "MEDIUM",
            },
            headers=headers,
        )
        task_id = create_resp.json()["id"]

        # 2. Move to IN_PROGRESS -> completed_at remains None
        step1 = await ac.patch(
            f"/api/v1/remediation/tasks/{task_id}/status",
            json={"status": "IN_PROGRESS"},
            headers=headers,
        )
        assert step1.status_code == 200
        assert step1.json()["status"] == "IN_PROGRESS"
        assert step1.json()["completed_at"] is None

        # 3. Move to COMPLETED -> completed_at is automatically timestamped
        step2 = await ac.patch(
            f"/api/v1/remediation/tasks/{task_id}/status",
            json={"status": "COMPLETED"},
            headers=headers,
        )
        assert step2.status_code == 200
        assert step2.json()["status"] == "COMPLETED"
        assert step2.json()["completed_at"] is not None

        # 4. Move back to IN_REVIEW -> completed_at is cleared
        step3 = await ac.patch(
            f"/api/v1/remediation/tasks/{task_id}/status",
            json={"status": "IN_REVIEW"},
            headers=headers,
        )
        assert step3.status_code == 200
        assert step3.json()["status"] == "IN_REVIEW"
        assert step3.json()["completed_at"] is None


@pytest.mark.asyncio
async def test_batch_status_update(remediation_test_env):
    """Verifies batch updating status across multiple remediation tasks."""
    env = remediation_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create two tasks
        t1 = (await ac.post(
            "/api/v1/remediation/tasks",
            json={"assessment_id": str(ass_id), "outcome_id": "B1.a", "title": "Review Remote Working Policy"},
            headers=headers,
        )).json()["id"]

        t2 = (await ac.post(
            "/api/v1/remediation/tasks",
            json={"assessment_id": str(ass_id), "outcome_id": "B1.b", "title": "Mandatory Cyber Hygiene Training"},
            headers=headers,
        )).json()["id"]

        # Batch update to IN_PROGRESS
        batch_resp = await ac.patch(
            "/api/v1/remediation/tasks/batch-status",
            json={"task_ids": [t1, t2], "status": "IN_PROGRESS"},
            headers=headers,
        )
        assert batch_resp.status_code == 200
        data = batch_resp.json()
        assert len(data) == 2
        assert all(t["status"] == "IN_PROGRESS" for t in data)


@pytest.mark.asyncio
async def test_remediation_summary_metrics_and_budget(remediation_test_env):
    """Verifies summary metrics calculation including total budget, effort, and SLA compliance."""
    env = remediation_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Task 1: On-time open task (£10,000, 40 hrs)
        await ac.post(
            "/api/v1/remediation/tasks",
            json={
                "assessment_id": str(ass_id),
                "outcome_id": "B2.b",
                "title": "PAM Implementation",
                "status": "IN_PROGRESS",
                "priority": "CRITICAL",
                "estimated_cost_gbp": 10000.0,
                "estimated_effort_hours": 40.0,
                "target_completion_date": (date.today() + timedelta(days=20)).isoformat(),
            },
            headers=headers,
        )

        # Task 2: Completed task (£5,000, 20 hrs)
        t2 = (await ac.post(
            "/api/v1/remediation/tasks",
            json={
                "assessment_id": str(ass_id),
                "outcome_id": "C1.a",
                "title": "Enable Syslog Forwarding to SIEM",
                "priority": "HIGH",
                "estimated_cost_gbp": 5000.0,
                "estimated_effort_hours": 20.0,
                "target_completion_date": (date.today() + timedelta(days=5)).isoformat(),
            },
            headers=headers,
        )).json()["id"]
        await ac.patch(
            f"/api/v1/remediation/tasks/{t2}/status",
            json={"status": "COMPLETED"},
            headers=headers,
        )

        # Task 3: Overdue task (£2,000, 10 hrs)
        await ac.post(
            "/api/v1/remediation/tasks",
            json={
                "assessment_id": str(ass_id),
                "outcome_id": "A4.a",
                "title": "Vendor Risk Questionnaire",
                "status": "BACKLOG",
                "priority": "MEDIUM",
                "estimated_cost_gbp": 2000.0,
                "estimated_effort_hours": 10.0,
                "target_completion_date": (date.today() - timedelta(days=5)).isoformat(),  # past deadline
            },
            headers=headers,
        )

        # Query Summary
        summary_resp = await ac.get(f"/api/v1/remediation/summary?assessment_id={ass_id}", headers=headers)
        assert summary_resp.status_code == 200
        summary = summary_resp.json()

        assert summary["total_tasks"] == 3
        assert summary["open_tasks"] == 2
        assert summary["completed_tasks"] == 1
        assert summary["in_progress_tasks"] == 1
        assert summary["total_budget_required_gbp"] == 17000.0
        assert summary["total_estimated_effort_hours"] == 70.0
        assert summary["overdue_tasks_count"] == 1
        # 2 compliant out of 3 = 66.7%
        assert summary["sla_compliance_rate"] == 66.7


@pytest.mark.asyncio
async def test_tenant_isolation_on_remediation_tasks(remediation_test_env):
    """Verifies that Tenant B cannot access or modify Tenant A's remediation tasks."""
    env = remediation_test_env
    headers_a = {"Authorization": f"Bearer {env['token_ciso']}"}
    headers_b = {"Authorization": f"Bearer {env['token_b']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create task in Tenant A
        t_a = (await ac.post(
            "/api/v1/remediation/tasks",
            json={"assessment_id": str(ass_id), "outcome_id": "B2.a", "title": "Tenant A Secret Fix"},
            headers=headers_a,
        )).json()["id"]

        # Tenant B tries to get Tenant A's task
        res_get = await ac.get(f"/api/v1/remediation/tasks/{t_a}", headers=headers_b)
        assert res_get.status_code == 404

        # Tenant B tries to update Tenant A's task
        res_patch = await ac.patch(
            f"/api/v1/remediation/tasks/{t_a}/status",
            json={"status": "COMPLETED"},
            headers=headers_b,
        )
        assert res_patch.status_code == 404

        # Tenant B lists tasks -> empty
        res_list = await ac.get("/api/v1/remediation/tasks", headers=headers_b)
        assert res_list.status_code == 200
        assert len(res_list.json()) == 0


@pytest.mark.asyncio
async def test_rbac_delete_task_permission(remediation_test_env):
    """Verifies that CISO admin can delete a task, but Auditor or Assessor cannot."""
    env = remediation_test_env
    headers_ciso = {"Authorization": f"Bearer {env['token_ciso']}"}
    headers_auditor = {"Authorization": f"Bearer {env['token_auditor']}"}
    ass_id = env["assessment_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create task
        task_id = (await ac.post(
            "/api/v1/remediation/tasks",
            json={"assessment_id": str(ass_id), "outcome_id": "B3.a", "title": "Data Classification Review"},
            headers=headers_ciso,
        )).json()["id"]

        # Auditor attempts deletion -> 403
        del_auditor = await ac.delete(f"/api/v1/remediation/tasks/{task_id}", headers=headers_auditor)
        assert del_auditor.status_code == 403

        # CISO deletes -> 204
        del_ciso = await ac.delete(f"/api/v1/remediation/tasks/{task_id}", headers=headers_ciso)
        assert del_ciso.status_code == 204

        # Task is gone -> 404
        get_resp = await ac.get(f"/api/v1/remediation/tasks/{task_id}", headers=headers_ciso)
        assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_access_rejected():
    """Verifies that accessing remediation endpoints without JWT token returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/remediation/tasks")
        assert resp.status_code == 401
