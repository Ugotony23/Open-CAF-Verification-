"""Unit & Integration Tests for Evidence Storage Engine & Metadata API."""
import io
import hashlib
import tempfile
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.evidence import EvidenceCategory
from app.services.storage_service import storage_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="function")
async def evidence_test_env():
    """Initializes in-memory test database, temporary storage directory, and test council tenants."""
    temp_dir = tempfile.TemporaryDirectory()
    storage_service.base_dir = Path(temp_dir.name)

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        tenant_a = CouncilTenant(name="Borsetshire Council", authority_type=AuthorityType.UNITARY)
        tenant_b = CouncilTenant(name="Southshire Council", authority_type=AuthorityType.COUNTY)
        session.add_all([tenant_a, tenant_b])
        await session.flush()

        user_a = User(
            tenant_id=tenant_a.id,
            email="ciso@borsetshire.gov.uk",
            hashed_password=get_password_hash("Secret123!"),
            full_name="Arthur Pendelton",
            role=UserRole.CISO_ADMIN,
            is_active=True,
        )
        user_b = User(
            tenant_id=tenant_b.id,
            email="assessor@southshire.gov.uk",
            hashed_password=get_password_hash("Secret123!"),
            full_name="Bob Assessor",
            role=UserRole.SECURITY_ASSESSOR,
            is_active=True,
        )
        session.add_all([user_a, user_b])
        await session.commit()

        token_a = create_access_token(user_a.id, tenant_a.id, user_a.role.value)
        token_b = create_access_token(user_b.id, tenant_b.id, user_b.role.value)
        tenant_a_id = tenant_a.id
        tenant_b_id = tenant_b.id

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield {
        "token_a": token_a,
        "token_b": token_b,
        "tenant_a_id": tenant_a_id,
        "tenant_b_id": tenant_b_id,
    }

    app.dependency_overrides.clear()
    temp_dir.cleanup()

@pytest.mark.asyncio
async def test_evidence_upload_and_sha256_hash(evidence_test_env):
    """Verifies file upload, automatic SHA-256 calculation, and metadata storage."""
    token = evidence_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        content = b"%PDF-1.4 Mock Council Cyber Security Incident Response Policy 2026..."
        expected_hash = hashlib.sha256(content).hexdigest()

        files = {
            "file": ("CIRP_Policy_2026.pdf", io.BytesIO(content), "application/pdf")
        }
        data = {
            "title": "Cyber Incident Response Plan",
            "category": "POLICY",
            "description": "Board-approved incident response policy and notification procedures.",
            "valid_to": "2026-12-31",
        }

        response = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data,
        )

        assert response.status_code == 201, response.text
        res_data = response.json()

        assert res_data["title"] == "Cyber Incident Response Plan"
        assert res_data["category"] == "POLICY"
        assert res_data["file_name"] == "CIRP_Policy_2026.pdf"
        assert res_data["file_size_bytes"] == len(content)
        assert res_data["sha256_hash"] == expected_hash

@pytest.mark.asyncio
async def test_evidence_download_and_header_checksum(evidence_test_env):
    """Verifies streaming download with X-Checksum-SHA256 header and matching byte content."""
    token = evidence_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        content = b"Host,Port,Vulnerability,Severity\n192.168.1.10,443,TLS1.0 Detected,Medium\n"
        expected_hash = hashlib.sha256(content).hexdigest()

        files = {
            "file": ("perimeter_scan_results.csv", io.BytesIO(content), "text/csv")
        }
        data = {
            "title": "Perimeter Vulnerability Scan Q1",
            "category": "VULNERABILITY_SCAN",
        }

        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data,
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        # Download
        download_res = await client.get(
            f"/api/v1/evidence/{evidence_id}/download",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert download_res.status_code == 200
        assert download_res.headers.get("x-checksum-sha256") == expected_hash
        assert download_res.content == content

@pytest.mark.asyncio
async def test_evidence_list_search_and_category_filters(evidence_test_env):
    """Verifies listing evidence items with category filtering and text search."""
    token = evidence_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload Item 1 (Policy)
        await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("access_control_policy.docx", io.BytesIO(b"Doc content"), "application/octet-stream")},
            data={"title": "Access Control & Identity Policy", "category": "POLICY"},
        )
        # Upload Item 2 (Penetration Test)
        await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("pentest_report_2025.pdf", io.BytesIO(b"CHECK Pentest results"), "application/pdf")},
            data={"title": "External CHECK Penetration Test", "category": "PENTEST_REPORT"},
        )

        # List all
        list_all = await client.get(
            "/api/v1/evidence",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_all.status_code == 200
        assert list_all.json()["total"] == 2

        # Filter by category
        filter_cat = await client.get(
            "/api/v1/evidence?category=POLICY",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert filter_cat.status_code == 200
        assert filter_cat.json()["total"] == 1
        assert filter_cat.json()["items"][0]["title"] == "Access Control & Identity Policy"

        # Search by keyword
        search_res = await client.get(
            "/api/v1/evidence?search=CHECK",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert search_res.status_code == 200
        assert search_res.json()["total"] == 1
        assert search_res.json()["items"][0]["category"] == "PENTEST_REPORT"

@pytest.mark.asyncio
async def test_evidence_file_extension_validation(evidence_test_env):
    """Verifies rejection of unsupported file extensions for cyber safety."""
    token = evidence_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": ("malware_payload.exe", io.BytesIO(b"MZ executable"), "application/octet-stream")
        }
        data = {"title": "Suspicious Executable", "category": "AUDIT_LOG"}

        response = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data,
        )
        assert response.status_code == 400
        assert "Unsupported file extension" in response.json()["detail"]

@pytest.mark.asyncio
async def test_evidence_tenant_isolation(evidence_test_env):
    """Verifies Tenant B cannot access or download evidence artifacts belonging to Tenant A."""
    token_a = evidence_test_env["token_a"]
    token_b = evidence_test_env["token_b"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Tenant A uploads
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("confidential_architecture.png", io.BytesIO(b"PNG mock data"), "image/png")},
            data={"title": "Council Network Topology Diagram", "category": "ARCHITECTURE_DIAGRAM"},
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        # Tenant B tries to get metadata
        get_res = await client.get(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert get_res.status_code == 404

        # Tenant B tries to download file
        download_res = await client.get(
            f"/api/v1/evidence/{evidence_id}/download",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert download_res.status_code == 404

        # Tenant B lists evidence - should be empty
        list_res = await client.get(
            "/api/v1/evidence",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert list_res.status_code == 200
        assert list_res.json()["total"] == 0

@pytest.mark.asyncio
async def test_evidence_delete_purges_record_and_file(evidence_test_env):
    """Verifies deleting evidence removes database record and disk file."""
    token = evidence_test_env["token_a"]
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload
        upload_res = await client.post(
            "/api/v1/evidence/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("drill_after_action.txt", io.BytesIO(b"Ransomware drill notes"), "text/plain")},
            data={"title": "Ransomware Tabletop Drill Notes", "category": "INCIDENT_DRILL"},
        )
        assert upload_res.status_code == 201
        evidence_id = upload_res.json()["id"]

        # Delete
        delete_res = await client.delete(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_res.status_code == 204

        # Verify not found
        get_res = await client.get(
            f"/api/v1/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_res.status_code == 404
