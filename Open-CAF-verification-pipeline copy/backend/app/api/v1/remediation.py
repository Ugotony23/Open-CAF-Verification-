"""REST API Router for Remediation Task Management Engine."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.remediation import RemediationStatus, RemediationPriority
from app.schemas.remediation import (
    RemediationTaskCreate,
    RemediationTaskCreateFromGap,
    RemediationTaskUpdate,
    RemediationTaskStatusUpdate,
    RemediationTaskBatchStatusUpdate,
    RemediationTaskResponse,
    RemediationSummaryResponse,
)
from app.api.deps import get_current_active_user, require_role
from app.services.remediation_service import RemediationService

router = APIRouter(prefix="/remediation", tags=["Remediation Planner"])


@router.get(
    "/tasks",
    response_model=List[RemediationTaskResponse],
    summary="List remediation tasks scoped to the current council tenant",
)
async def list_tasks(
    assessment_id: Optional[UUID] = Query(None, description="Filter by assessment ID"),
    status: Optional[RemediationStatus] = Query(None, description="Filter by task status"),
    priority: Optional[RemediationPriority] = Query(None, description="Filter by priority"),
    outcome_id: Optional[str] = Query(None, description="Filter by CAF Contributing Outcome code (e.g. B2.a)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all remediation action items belonging to the authenticated council tenant."""
    tasks = await RemediationService.list_tasks(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment_id,
        status_filter=status,
        priority_filter=priority,
        outcome_id=outcome_id,
    )
    return [RemediationTaskResponse.model_validate(t) for t in tasks]


@router.post(
    "/tasks",
    response_model=RemediationTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a manual remediation task",
)
async def create_task(
    payload: RemediationTaskCreate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """Manually creates a remediation action item linked to an assessment outcome."""
    task = await RemediationService.create_task(
        db=db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        user_id=current_user.id,
    )
    return RemediationTaskResponse.model_validate(task)


@router.post(
    "/tasks/from-gap",
    response_model=RemediationTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Auto-generate a remediation task from an identified CAF gap",
)
async def create_task_from_gap(
    payload: RemediationTaskCreateFromGap,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-populates task title, description, technical steps checklist, priority,
    estimated budget (£ GBP), and SLA target date from the detected gap.
    """
    task = await RemediationService.create_task_from_gap(
        db=db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        user_id=current_user.id,
    )
    return RemediationTaskResponse.model_validate(task)


@router.get(
    "/tasks/{task_id}",
    response_model=RemediationTaskResponse,
    summary="Get remediation task details by ID",
)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a specific remediation action item ensuring tenant scoping."""
    task = await RemediationService.get_task(
        db=db,
        task_id=task_id,
        tenant_id=current_user.tenant_id,
    )
    return RemediationTaskResponse.model_validate(task)


@router.patch(
    "/tasks/batch-status",
    response_model=List[RemediationTaskResponse],
    summary="Batch update status for multiple tasks",
)
async def batch_update_status(
    payload: RemediationTaskBatchStatusUpdate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """Batch updates status for multiple remediation tasks in a single operation."""
    updated_tasks = []
    for task_id in payload.task_ids:
        task = await RemediationService.update_task_status(
            db=db,
            task_id=task_id,
            tenant_id=current_user.tenant_id,
            new_status=payload.status,
            user_id=current_user.id,
        )
        updated_tasks.append(task)
    return [RemediationTaskResponse.model_validate(t) for t in updated_tasks]


@router.patch(
    "/tasks/{task_id}",
    response_model=RemediationTaskResponse,
    summary="Update remediation task details",
)
async def update_task(
    task_id: UUID,
    payload: RemediationTaskUpdate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """Updates remediation task fields, owner, dates, effort, and cost."""
    task = await RemediationService.update_task(
        db=db,
        task_id=task_id,
        tenant_id=current_user.tenant_id,
        payload=payload,
        user_id=current_user.id,
    )
    return RemediationTaskResponse.model_validate(task)


@router.patch(
    "/tasks/{task_id}/status",
    response_model=RemediationTaskResponse,
    summary="Fast status update (Kanban drag-and-drop transition)",
)
async def update_task_status(
    task_id: UUID,
    payload: RemediationTaskStatusUpdate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Transitions a task between BACKLOG, IN_PROGRESS, IN_REVIEW, COMPLETED, and CANCELLED.
    Automatically sets completed_at timestamp when marked COMPLETED.
    """
    task = await RemediationService.update_task_status(
        db=db,
        task_id=task_id,
        tenant_id=current_user.tenant_id,
        new_status=payload.status,
        user_id=current_user.id,
    )
    return RemediationTaskResponse.model_validate(task)


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a remediation task",
)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a remediation task record (CISO_ADMIN only)."""
    await RemediationService.delete_task(
        db=db,
        task_id=task_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    return None


@router.get(
    "/summary",
    response_model=RemediationSummaryResponse,
    summary="Get remediation budget, effort, and SLA compliance metrics",
)
async def get_remediation_summary(
    assessment_id: Optional[UUID] = Query(None, description="Optional assessment filter"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes total budget required (£ GBP), total engineering hours, task status counts,
    and SLA compliance rate for council audit committee briefings.
    """
    return await RemediationService.get_remediation_summary(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment_id,
    )
