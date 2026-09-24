"""REST API Router for Council Service Criticality Catalog & Configuration."""
import json
import uuid
from pathlib import Path
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.council_service import CouncilService, ServiceTier, TIER_WEIGHTS
from app.models.audit import AuditLog
from app.schemas.council_service import (
    CouncilServiceCreate,
    CouncilServiceUpdate,
    CouncilServiceResponse,
    CouncilServiceListResponse,
)
from app.api.deps import get_current_active_user, require_role

router = APIRouter(prefix="/council-services", tags=["Council Service Catalog"])


def find_council_services_seed_file() -> Path:
    """Locate data/council_services.json searching upwards from current working directory."""
    candidates = [
        Path.cwd() / "data" / "council_services.json",
        Path.cwd().parent / "data" / "council_services.json",
        Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "council_services.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise FileNotFoundError("Could not find data/council_services.json in standard locations.")


@router.get(
    "",
    response_model=CouncilServiceListResponse,
    summary="List council services configured for the current tenant",
)
async def list_council_services(
    tier: Optional[ServiceTier] = Query(None, description="Filter by criticality tier"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the catalog of council services for the current local authority tenant,
    with tier metrics and configurable filtering.
    """
    query = select(CouncilService).filter_by(tenant_id=current_user.tenant_id)

    if tier is not None:
        query = query.filter(CouncilService.tier == tier)
    if is_active is not None:
        query = query.filter(CouncilService.is_active == is_active)

    query = query.order_by(CouncilService.tier.asc(), CouncilService.name.asc())
    result = await db.execute(query)
    services = list(result.scalars().all())

    # Count breakdown across all tenant services
    counts_query = (
        select(CouncilService.tier, func.count(CouncilService.id))
        .filter_by(tenant_id=current_user.tenant_id)
        .group_by(CouncilService.tier)
    )
    counts_result = await db.execute(counts_query)
    tier_counts = {
        ServiceTier.TIER_1.value: 0,
        ServiceTier.TIER_2.value: 0,
        ServiceTier.TIER_3.value: 0,
    }
    for row_tier, count in counts_result.all():
        tier_val = row_tier.value if hasattr(row_tier, "value") else str(row_tier)
        tier_counts[tier_val] = count

    return CouncilServiceListResponse(
        services=[CouncilServiceResponse.model_validate(s) for s in services],
        total=len(services),
        tier_counts=tier_counts,
    )


@router.post(
    "",
    response_model=CouncilServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or register a council service entry",
)
async def create_council_service(
    service_in: CouncilServiceCreate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a council service entry under the tenant's catalog with defined criticality tier.
    """
    # Check for duplicate service name within tenant
    existing = await db.execute(
        select(CouncilService).filter_by(
            tenant_id=current_user.tenant_id,
            name=service_in.name.strip(),
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A service named '{service_in.name}' already exists in your council service catalog.",
        )

    weight = (
        service_in.weight_multiplier
        if service_in.weight_multiplier is not None
        else TIER_WEIGHTS.get(service_in.tier, 1.0)
    )

    service_id = uuid.uuid4()
    service = CouncilService(
        id=service_id,
        tenant_id=current_user.tenant_id,
        name=service_in.name.strip(),
        description=service_in.description,
        tier=service_in.tier,
        weight_multiplier=weight,
        is_active=service_in.is_active,
    )
    db.add(service)

    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="COUNCIL_SERVICE_CREATED",
        entity_type="COUNCIL_SERVICE",
        entity_id=str(service_id),
        payload_after={"name": service.name, "tier": service.tier.value, "weight": weight},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(service)
    return CouncilServiceResponse.model_validate(service)


@router.get(
    "/{service_id}",
    response_model=CouncilServiceResponse,
    summary="Get council service details by ID",
)
async def get_council_service(
    service_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns details for a specific council service owned by the authenticated tenant."""
    result = await db.execute(
        select(CouncilService).filter_by(id=service_id, tenant_id=current_user.tenant_id)
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Council service not found in tenant catalog",
        )
    return CouncilServiceResponse.model_validate(service)


@router.patch(
    "/{service_id}",
    response_model=CouncilServiceResponse,
    summary="Update council service details or tier",
)
async def update_council_service(
    service_id: UUID,
    service_update: CouncilServiceUpdate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """Updates service details, criticality tier, or weight multiplier."""
    result = await db.execute(
        select(CouncilService).filter_by(id=service_id, tenant_id=current_user.tenant_id)
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Council service not found in tenant catalog",
        )

    # If updating name, verify uniqueness
    if service_update.name is not None and service_update.name.strip() != service.name:
        existing = await db.execute(
            select(CouncilService).filter(
                CouncilService.tenant_id == current_user.tenant_id,
                CouncilService.name == service_update.name.strip(),
                CouncilService.id != service_id,
            )
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another service named '{service_update.name}' already exists.",
            )
        service.name = service_update.name.strip()

    if service_update.description is not None:
        service.description = service_update.description

    if service_update.tier is not None:
        service.tier = service_update.tier
        if service_update.weight_multiplier is None:
            service.weight_multiplier = TIER_WEIGHTS.get(service.tier, 1.0)

    if service_update.weight_multiplier is not None:
        service.weight_multiplier = service_update.weight_multiplier

    if service_update.is_active is not None:
        service.is_active = service_update.is_active

    service.updated_at = datetime.now(timezone.utc)

    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="COUNCIL_SERVICE_UPDATED",
        entity_type="COUNCIL_SERVICE",
        entity_id=str(service.id),
        payload_after={
            "name": service.name,
            "tier": service.tier.value,
            "weight": service.weight_multiplier,
            "is_active": service.is_active,
        },
    )
    db.add(audit)

    await db.commit()
    await db.refresh(service)
    return CouncilServiceResponse.model_validate(service)


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a council service",
)
async def delete_council_service(
    service_id: UUID,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a council service record from the tenant's catalog."""
    result = await db.execute(
        select(CouncilService).filter_by(id=service_id, tenant_id=current_user.tenant_id)
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Council service not found in tenant catalog",
        )

    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="COUNCIL_SERVICE_DELETED",
        entity_type="COUNCIL_SERVICE",
        entity_id=str(service.id),
        payload_before={"name": service.name, "tier": service.tier.value},
    )
    db.add(audit)

    await db.delete(service)
    await db.commit()
    return None


@router.post(
    "/seed-defaults",
    response_model=CouncilServiceListResponse,
    summary="Populate default UK council services for current tenant",
)
async def seed_tenant_default_services(
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotently seeds standard UK local authority services (Tier 1, Tier 2, Tier 3)
    from council_services.json for the current tenant.
    """
    seed_path = find_council_services_seed_file()
    with open(seed_path, "r", encoding="utf-8") as f:
        default_services = json.load(f)

    for item in default_services:
        existing = await db.execute(
            select(CouncilService).filter_by(
                tenant_id=current_user.tenant_id,
                name=item["name"],
            )
        )
        if not existing.scalars().first():
            tier_enum = ServiceTier(item["tier"])
            weight = item.get("weight_multiplier", TIER_WEIGHTS.get(tier_enum, 1.0))
            new_service = CouncilService(
                tenant_id=current_user.tenant_id,
                name=item["name"],
                description=item.get("description"),
                tier=tier_enum,
                weight_multiplier=weight,
                is_active=item.get("is_active", True),
            )
            db.add(new_service)

    await db.commit()

    # Return refreshed list
    return await list_council_services(tier=None, is_active=None, current_user=current_user, db=db)
