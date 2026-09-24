"""Evidence REST API Endpoints with SHA-256 Checksum Verification."""
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.evidence import Evidence, EvidenceCategory
from app.models.audit import AuditLog
from app.schemas.evidence import (
    EvidenceResponse,
    EvidenceListResponse,
    EvidenceLinkCreate,
    EvidenceLinkResponse,
)
from app.api.deps import get_current_active_user, require_role
from app.services.storage_service import storage_service
from app.services.evidence_service import evidence_service

router = APIRouter(prefix="/evidence", tags=["Evidence Vault"])

@router.post(
    "/upload",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload tamper-evident evidence file with SHA-256 calculation",
)
async def upload_evidence(
    file: UploadFile = File(...),
    title: str = Form(..., min_length=3, max_length=255),
    category: EvidenceCategory = Form(...),
    description: Optional[str] = Form(None),
    valid_from: Optional[date] = Form(None),
    valid_to: Optional[date] = Form(None),
    external_url: Optional[str] = Form(None),
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams file upload, generates SHA-256 hash, validates MIME and 25MB limit,
    and stores evidence record linked to current council tenant.
    """
    file_path, sha256_hash, file_size, mime_type = await storage_service.save_file(
        file, current_user.tenant_id
    )

    evidence = Evidence(
        tenant_id=current_user.tenant_id,
        title=title,
        description=description,
        category=category,
        file_path=file_path,
        file_name=file.filename or "uploaded_file",
        file_size_bytes=file_size,
        mime_type=mime_type,
        sha256_hash=sha256_hash,
        external_url=external_url,
        valid_from=valid_from,
        valid_to=valid_to,
        uploaded_by_user_id=current_user.id,
    )
    db.add(evidence)

    audit_log = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="UPLOAD_EVIDENCE",
        entity_type="Evidence",
        entity_id=str(evidence.id),
        payload_after={
            "title": title,
            "file_name": evidence.file_name,
            "sha256_hash": sha256_hash,
            "file_size_bytes": file_size,
            "category": category.value,
        },
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(evidence)
    return evidence

@router.get(
    "",
    response_model=EvidenceListResponse,
    summary="List evidence items for current tenant with search & filter",
)
async def list_evidence(
    search: Optional[str] = Query(None, description="Search in title, description, or file name"),
    category: Optional[EvidenceCategory] = Query(None, description="Filter by evidence category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Evidence).where(Evidence.tenant_id == current_user.tenant_id)

    if category:
        query = query.where(Evidence.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Evidence.title.ilike(search_pattern),
                Evidence.description.ilike(search_pattern),
                Evidence.file_name.ilike(search_pattern),
            )
        )

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Query evidence items with their linked outcome ids
    query = query.order_by(Evidence.created_at.desc()).offset((page - 1) * page_size).limit(page_size).options(selectinload(Evidence.outcome_links))
    result = await db.execute(query)
    items = result.scalars().all()

    evidence_responses = []
    for item in items:
        resp = EvidenceResponse.model_validate(item)
        resp.is_stale = evidence_service.is_stale(item)
        resp.is_expiring_soon = evidence_service.is_expiring_soon(item)
        resp.linked_outcome_ids = [link.outcome_id for link in (item.outcome_links or [])]
        evidence_responses.append(resp)

    return EvidenceListResponse(
        items=evidence_responses,
        total=total,
        page=page,
        page_size=page_size,
    )

@router.get(
    "/{id}",
    response_model=EvidenceResponse,
    summary="Get single evidence item metadata with freshness status",
)
async def get_evidence(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Evidence)
        .where(
            Evidence.id == id,
            Evidence.tenant_id == current_user.tenant_id,
        )
        .options(selectinload(Evidence.outcome_links))
    )
    result = await db.execute(query)
    evidence = result.scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence artifact not found",
        )

    resp = EvidenceResponse.model_validate(evidence)
    resp.is_stale = evidence_service.is_stale(evidence)
    resp.is_expiring_soon = evidence_service.is_expiring_soon(evidence)
    resp.linked_outcome_ids = [link.outcome_id for link in (evidence.outcome_links or [])]
    return resp

@router.post(
    "/{id}/link",
    response_model=EvidenceLinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link evidence to a CAF Contributing Outcome with audit citation notes",
)
async def link_evidence_to_outcome(
    id: UUID,
    payload: EvidenceLinkCreate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    link = await evidence_service.link_evidence(
        db=db,
        evidence_id=id,
        outcome_id=payload.outcome_id,
        igp_id=payload.igp_id,
        citation_notes=payload.citation_notes,
        user=current_user,
    )

    ev_query = select(Evidence).where(Evidence.id == id)
    ev_res = await db.execute(ev_query)
    evidence = ev_res.scalar_one()

    audit_log = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="LINK_EVIDENCE_TO_OUTCOME",
        entity_type="EvidenceOutcomeLink",
        entity_id=str(link.id),
        payload_after={
            "evidence_id": str(id),
            "outcome_id": payload.outcome_id,
            "igp_id": str(payload.igp_id) if payload.igp_id else None,
            "citation_notes": payload.citation_notes,
        },
    )
    db.add(audit_log)
    await db.commit()

    return EvidenceLinkResponse(
        id=link.id,
        evidence_id=link.evidence_id,
        outcome_id=link.outcome_id,
        igp_id=link.igp_id,
        citation_notes=link.citation_notes,
        linked_by_user_id=link.linked_by_user_id,
        linked_at=link.linked_at,
        evidence_title=evidence.title,
        file_name=evidence.file_name,
        is_stale=evidence_service.is_stale(evidence),
        is_expiring_soon=evidence_service.is_expiring_soon(evidence),
    )

@router.delete(
    "/{id}/link/{outcome_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink evidence from a Contributing Outcome",
)
async def unlink_evidence_from_outcome(
    id: UUID,
    outcome_id: str,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    await evidence_service.unlink_evidence(
        db=db,
        evidence_id=id,
        outcome_id=outcome_id,
        tenant_id=current_user.tenant_id,
    )

    audit_log = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="UNLINK_EVIDENCE_FROM_OUTCOME",
        entity_type="EvidenceOutcomeLink",
        entity_id=f"{id}:{outcome_id}",
        payload_after={"evidence_id": str(id), "outcome_id": outcome_id},
    )
    db.add(audit_log)
    await db.commit()
    return None

@router.get(
    "/{id}/download",
    summary="Stream evidence file with SHA-256 integrity header",
)
async def download_evidence(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Evidence).where(
        Evidence.id == id,
        Evidence.tenant_id == current_user.tenant_id,
    )
    result = await db.execute(query)
    evidence = result.scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence artifact not found",
        )

    path = storage_service.get_file_path(evidence.file_path)

    return FileResponse(
        path=path,
        filename=evidence.file_name,
        media_type=evidence.mime_type,
        headers={
            "X-Checksum-SHA256": evidence.sha256_hash,
            "Access-Control-Expose-Headers": "X-Checksum-SHA256",
        },
    )

@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete evidence artifact and purge physical file",
)
async def delete_evidence(
    id: UUID,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    query = select(Evidence).where(
        Evidence.id == id,
        Evidence.tenant_id == current_user.tenant_id,
    )
    result = await db.execute(query)
    evidence = result.scalar_one_or_none()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence artifact not found",
        )

    storage_service.delete_file(evidence.file_path)
    await db.delete(evidence)

    audit_log = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="DELETE_EVIDENCE",
        entity_type="Evidence",
        entity_id=str(evidence.id),
        payload_after={"title": evidence.title, "file_name": evidence.file_name},
    )
    db.add(audit_log)

    await db.commit()
    return None
