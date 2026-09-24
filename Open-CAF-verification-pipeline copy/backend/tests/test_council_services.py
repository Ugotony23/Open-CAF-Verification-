"""Unit & Integration Tests for Council Service Criticality Catalog & Configuration."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.council_service import CouncilService, ServiceTier, TIER_WEIGHTS
from app.cli.seed_council_services import seed_council_services_data

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def services_test_env():
    """Initializes in-memory test DB, creates council tenant and authenticated users."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
        # Assessor in Tenant A
        assessor = User(
            tenant_id=tenant_a.id,
            email="assessor@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Beatrice Webb",
            role=UserRole.SECURITY_ASSESSOR,
            is_active=True,
        )
        # Auditor in Tenant A (read-only)
        auditor = User(
            tenant_id=tenant_a.id,
            email="auditor@borsetshire.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Charles Audit",
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

    # Seed services for Tenant A using sync connection
    async with engine.connect() as conn:
        def do_seed(connection):
            sync_sess = Session(bind=connection)
            seed_council_services_data(session=sync_sess, tenant_id=tenant_a.id)
            sync_sess.close()
        await conn.run_sync(do_seed)
        await conn.commit()

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
        "token_ciso": token_ciso,
        "token_assessor": token_assessor,
        "token_auditor": token_auditor,
        "token_b": token_b,
    }

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_seed_council_services_completeness_and_tiers(services_test_env):
    """Verifies that the standard catalog contains 12 services with appropriate tiers & weights."""
    env = services_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/council-services", headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["total"] == 12
        assert data["tier_counts"]["TIER_1"] == 5
        assert data["tier_counts"]["TIER_2"] == 4
        assert data["tier_counts"]["TIER_3"] == 3

        # Verify weights
        for svc in data["services"]:
            if svc["tier"] == "TIER_1":
                assert svc["weight_multiplier"] == 3.0
            elif svc["tier"] == "TIER_2":
                assert svc["weight_multiplier"] == 2.0
            elif svc["tier"] == "TIER_3":
                assert svc["weight_multiplier"] == 1.0


@pytest.mark.asyncio
async def test_filter_council_services_by_tier(services_test_env):
    """Verifies filtering council services by criticality tier."""
    env = services_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Filter Tier 1
        resp_t1 = await ac.get("/api/v1/council-services?tier=TIER_1", headers=headers)
        assert resp_t1.status_code == 200
        data_t1 = resp_t1.json()
        assert data_t1["total"] == 5
        assert all(s["tier"] == "TIER_1" for s in data_t1["services"])

        # Filter Tier 3
        resp_t3 = await ac.get("/api/v1/council-services?tier=TIER_3", headers=headers)
        assert resp_t3.status_code == 200
        data_t3 = resp_t3.json()
        assert data_t3["total"] == 3
        assert all(s["tier"] == "TIER_3" for s in data_t3["services"])


@pytest.mark.asyncio
async def test_create_and_update_custom_council_service(services_test_env):
    """Verifies creating a custom council service and modifying its tier and weight."""
    env = services_test_env
    headers = {"Authorization": f"Bearer {env['token_ciso']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create custom service
        payload = {
            "name": "Harbour Authority & Maritime Safety Dispatch",
            "description": "Port control, tidal barrier management, and search-and-rescue communication.",
            "tier": "TIER_1",
        }
        create_resp = await ac.post("/api/v1/council-services", json=payload, headers=headers)
        assert create_resp.status_code == 201
        new_svc = create_resp.json()
        assert new_svc["name"] == payload["name"]
        assert new_svc["tier"] == "TIER_1"
        assert new_svc["weight_multiplier"] == 3.0  # automatically applied

        service_id = new_svc["id"]

        # Duplicate name rejection
        dup_resp = await ac.post("/api/v1/council-services", json=payload, headers=headers)
        assert dup_resp.status_code == 400

        # Update service
        patch_payload = {
            "description": "Updated port control and maritime radar telemetry.",
            "weight_multiplier": 3.5,
        }
        patch_resp = await ac.patch(f"/api/v1/council-services/{service_id}", json=patch_payload, headers=headers)
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["description"] == patch_payload["description"]
        assert updated["weight_multiplier"] == 3.5

        # Get service by ID
        get_resp = await ac.get(f"/api/v1/council-services/{service_id}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == service_id


@pytest.mark.asyncio
async def test_delete_council_service(services_test_env):
    """Verifies that CISO admin can delete a service and unauthorized roles cannot."""
    env = services_test_env
    headers_ciso = {"Authorization": f"Bearer {env['token_ciso']}"}
    headers_auditor = {"Authorization": f"Bearer {env['token_auditor']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a disposable service
        create_resp = await ac.post(
            "/api/v1/council-services",
            json={"name": "Temporary Festival Wi-Fi", "tier": "TIER_3"},
            headers=headers_ciso,
        )
        assert create_resp.status_code == 201
        svc_id = create_resp.json()["id"]

        # Auditor cannot delete
        del_auditor_resp = await ac.delete(f"/api/v1/council-services/{svc_id}", headers=headers_auditor)
        assert del_auditor_resp.status_code == 403

        # CISO deletes
        del_resp = await ac.delete(f"/api/v1/council-services/{svc_id}", headers=headers_ciso)
        assert del_resp.status_code == 204

        # Service is gone
        get_resp = await ac.get(f"/api/v1/council-services/{svc_id}", headers=headers_ciso)
        assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_tenant_isolation_on_council_services(services_test_env):
    """Verifies that services from Tenant A are completely invisible and unmodifiable by Tenant B."""
    env = services_test_env
    headers_a = {"Authorization": f"Bearer {env['token_ciso']}"}
    headers_b = {"Authorization": f"Bearer {env['token_b']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Tenant B has 0 services initially
        resp_b = await ac.get("/api/v1/council-services", headers=headers_b)
        assert resp_b.status_code == 200
        assert resp_b.json()["total"] == 0

        # Tenant A has 12 services
        resp_a = await ac.get("/api/v1/council-services", headers=headers_a)
        assert resp_a.status_code == 200
        service_a_id = resp_a.json()["services"][0]["id"]

        # Tenant B tries to fetch Tenant A's service
        resp_cross_get = await ac.get(f"/api/v1/council-services/{service_a_id}", headers=headers_b)
        assert resp_cross_get.status_code == 404

        # Tenant B tries to delete Tenant A's service
        resp_cross_del = await ac.delete(f"/api/v1/council-services/{service_a_id}", headers=headers_b)
        assert resp_cross_del.status_code == 404

        # Tenant B seeds their own defaults via API
        seed_resp = await ac.post("/api/v1/council-services/seed-defaults", headers=headers_b)
        assert seed_resp.status_code == 200
        assert seed_resp.json()["total"] == 12


@pytest.mark.asyncio
async def test_unauthenticated_access_rejected():
    """Verifies that accessing council services without JWT token returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/council-services")
        assert resp.status_code == 401
