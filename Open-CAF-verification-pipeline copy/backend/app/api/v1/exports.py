"""API Endpoints for Open CAF Multi-Format Exporters (CSV, Excel, Jira, GitHub)."""
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.assessment import Assessment
from app.models.tenant import CouncilTenant
from app.services.remediation_service import RemediationService
from app.services.export_service import ExportService
from app.api.deps import get_current_active_user, require_role

router = APIRouter(prefix="/assessments", tags=["Integrations & Exporters"])


class JiraExportRequest(BaseModel):
    project_key: str = Field(default="CAF", min_length=2, max_length=20, description="Jira Project Key")
    issue_type: str = Field(default="Task", min_length=1, max_length=50, description="Jira Issue Type")


async def get_validated_assessment_and_tenant(
    assessment_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[Assessment, CouncilTenant]:
    """Helper to validate assessment and tenant ownership."""
    ass_res = await db.execute(
        select(Assessment).filter_by(id=assessment_id, tenant_id=tenant_id)
    )
    assessment = ass_res.scalars().first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found or does not belong to your council",
        )

    ten_res = await db.execute(select(CouncilTenant).filter_by(id=tenant_id))
    tenant = ten_res.scalars().first()

    return assessment, tenant


@router.get(
    "/{assessment_id}/export/csv",
    summary="Export remediation action plan as RFC 4180 CSV",
    response_class=Response,
)
async def export_remediation_csv(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates and streams an RFC 4180 compliant CSV of all remediation tasks
    for this assessment, including outcome codes, cost, effort, and statuses.
    """
    assessment, _ = await get_validated_assessment_and_tenant(
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
        db=db,
    )

    tasks = await RemediationService.list_tasks(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment.id,
    )

    csv_data = ExportService.export_remediation_csv(tasks)

    filename = f"opencaf_remediation_{assessment_id}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get(
    "/{assessment_id}/export/excel",
    summary="Export formatted remediation action plan as Excel (.xlsx)",
    response_class=Response,
)
async def export_remediation_excel(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a beautifully styled Excel (.xlsx) action plan with GOV.UK Blue branding,
    conditional priority/status cell formatting, currency styling for £ GBP, and summary formulas.
    """
    assessment, tenant = await get_validated_assessment_and_tenant(
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
        db=db,
    )

    tasks = await RemediationService.list_tasks(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment.id,
    )

    council_name = tenant.name if tenant else "Borsetshire Council"
    assessment_title = assessment.title if assessment else "CAF Assessment"

    excel_bytes = ExportService.export_excel_action_plan(
        tasks=tasks,
        assessment_title=assessment_title,
        council_name=council_name,
    )

    filename = f"opencaf_remediation_action_plan_{assessment_id}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.post(
    "/{assessment_id}/export/jira-json",
    summary="Export remediation tasks as Jira REST API v2/v3 bulk JSON",
)
async def export_remediation_jira(
    assessment_id: uuid.UUID,
    payload: Optional[JiraExportRequest] = Body(default=None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Transforms remediation tasks into Jira Cloud / Server bulk issue creation format:
    POST /rest/api/3/issue/bulk
    Includes summary, outcome tag labels, priorities, descriptions, and due dates.
    """
    assessment, _ = await get_validated_assessment_and_tenant(
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
        db=db,
    )

    tasks = await RemediationService.list_tasks(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment.id,
    )

    project_key = payload.project_key if payload else "CAF"
    issue_type = payload.issue_type if payload else "Task"

    return ExportService.export_jira_payload(
        tasks=tasks,
        project_key=project_key,
        issue_type=issue_type,
    )


@router.post(
    "/{assessment_id}/export/github-json",
    summary="Export remediation tasks as GitHub Issues batch payload",
)
async def export_remediation_github(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Transforms remediation tasks into GitHub Issues payload format with labels and checklists.
    """
    assessment, _ = await get_validated_assessment_and_tenant(
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
        db=db,
    )

    tasks = await RemediationService.list_tasks(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment.id,
    )

    return ExportService.export_github_issues_payload(tasks)
