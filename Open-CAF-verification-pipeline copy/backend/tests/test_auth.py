"""Unit & Integration Tests for Authentication, JWT & RBAC."""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole

# Async in-memory SQLite engine for API testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def async_test_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield async_session

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_initial_admin_registration(async_test_db):
    """Verifies bootstrap admin registration and subsequent lockout."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register initial admin
        payload = {
            "council_name": "Borsetshire District Council",
            "authority_type": "DISTRICT",
            "full_name": "Eleanor Vance",
            "email": "ciso@borsetshire.gov.uk",
            "password": "SuperSecurePassword2026!"
        }
        res = await client.post("/api/v1/auth/register-initial-admin", json=payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["email"] == "ciso@borsetshire.gov.uk"
        assert data["role"] == "CISO_ADMIN"
        assert data["tenant_name"] == "Borsetshire District Council"

        # 2. Second attempt must be rejected
        res2 = await client.post("/api/v1/auth/register-initial-admin", json=payload)
        assert res2.status_code == 400
        assert "already configured" in res2.json()["detail"]

@pytest.mark.asyncio
async def test_login_success_and_failure(async_test_db):
    """Verifies OAuth2 form login with valid and invalid credentials."""
    # Seed user in DB
    async with async_test_db() as session:
        tenant = CouncilTenant(name="Wessex County Council", authority_type=AuthorityType.COUNTY)
        session.add(tenant)
        await session.flush()

        user = User(
            tenant_id=tenant.id,
            email="assessor@wessex.gov.uk",
            hashed_password=get_password_hash("CorrectPassword123!"),
            full_name="John Smith",
            role=UserRole.SECURITY_ASSESSOR,
            is_active=True
        )
        session.add(user)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Correct credentials
        res = await client.post(
            "/api/v1/auth/login",
            data={"username": "assessor@wessex.gov.uk", "password": "CorrectPassword123!"}
        )
        assert res.status_code == 200, res.text
        tokens = res.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

        # 2. Incorrect password
        res_fail = await client.post(
            "/api/v1/auth/login",
            data={"username": "assessor@wessex.gov.uk", "password": "WrongPassword!"}
        )
        assert res_fail.status_code == 401
        assert "Incorrect email or password" in res_fail.json()["detail"]

@pytest.mark.asyncio
async def test_auth_me_and_refresh_flow(async_test_db):
    """Verifies /me endpoint profile retrieval and token refresh."""
    async with async_test_db() as session:
        tenant = CouncilTenant(name="Rutland Council", authority_type=AuthorityType.UNITARY)
        session.add(tenant)
        await session.flush()

        user = User(
            tenant_id=tenant.id,
            email="auditor@rutland.gov.uk",
            hashed_password=get_password_hash("Password123!"),
            full_name="Auditor Alice",
            role=UserRole.AUDITOR,
            is_active=True
        )
        session.add(user)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            data={"username": "auditor@rutland.gov.uk", "password": "Password123!"}
        )
        tokens = login_res.json()
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # Test /api/v1/auth/me
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "auditor@rutland.gov.uk"
        assert me_data["role"] == "AUDITOR"
        assert me_data["tenant_name"] == "Rutland Council"

        # Test token refresh
        ref_res = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert ref_res.status_code == 200
        new_tokens = ref_res.json()
        assert "access_token" in new_tokens

@pytest.mark.asyncio
async def test_rbac_role_guard_enforcement(async_test_db):
    """
    Verifies RBAC enforcement:
    - User with CISO_ADMIN or SECURITY_ASSESSOR can access /api/v1/test/assessor-only.
    - User with CABINET_VIEWER receives 403 Forbidden.
    """
    async with async_test_db() as session:
        tenant = CouncilTenant(name="Cornwall Council", authority_type=AuthorityType.UNITARY)
        session.add(tenant)
        await session.flush()

        ciso_user = User(
            tenant_id=tenant.id,
            email="ciso@cornwall.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="CISO Lead",
            role=UserRole.CISO_ADMIN,
            is_active=True
        )
        cabinet_user = User(
            tenant_id=tenant.id,
            email="councillor@cornwall.gov.uk",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Cabinet Councillor",
            role=UserRole.CABINET_VIEWER,
            is_active=True
        )
        session.add_all([ciso_user, cabinet_user])
        await session.commit()

        ciso_token = create_access_token(ciso_user.id, tenant.id, ciso_user.role.value)
        cabinet_token = create_access_token(cabinet_user.id, tenant.id, cabinet_user.role.value)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. CISO access should succeed
        ciso_res = await client.get(
            "/api/v1/test/assessor-only",
            headers={"Authorization": f"Bearer {ciso_token}"}
        )
        assert ciso_res.status_code == 200
        assert ciso_res.json()["role"] == "CISO_ADMIN"

        # 2. CABINET_VIEWER access must be rejected with 403
        cabinet_res = await client.get(
            "/api/v1/test/assessor-only",
            headers={"Authorization": f"Bearer {cabinet_token}"}
        )
        assert cabinet_res.status_code == 403
        assert "Insufficient permissions" in cabinet_res.json()["detail"]
