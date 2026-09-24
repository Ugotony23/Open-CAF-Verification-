"""Gap Analysis Engine REST Endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.gap import GapItem, GapSummary, GapTypeEnum, GapSeverityEnum
from app.services.gap_analysis_service import gap_analysis_service

router = APIRouter(tags=["Gap Analysis"])

@router.get(
    "/assessments/{id}/gaps",
    response_model=List[GapItem],
    summary="List all detected Evidential Gaps and Control Deficits for an assessment",
)
async def list_assessment_gaps(
    id: UUID,
    gap_type: Optional[GapTypeEnum] = Query(None, description="Filter by EVIDENTIAL_GAP or CONTROL_DEFICIT"),
    severity: Optional[GapSeverityEnum] = Query(None, description="Filter by baseline severity"),
    objective_id: Optional[str] = Query(None, description="Filter by CAF Objective ('A', 'B', 'C', 'D')"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Scans the 39 Contributing Outcomes in the specified council assessment.
    Categorizes outcomes lacking proof as Evidential Gaps and unachieved controls as Control Deficits.
    """
    gaps = await gap_analysis_service.detect_gaps(db, id, current_user.tenant_id)

    # Apply filters
    if gap_type:
        gaps = [g for g in gaps if g.gap_type == gap_type]
    if severity:
        gaps = [g for g in gaps if g.severity == severity]
    if objective_id:
        gaps = [g for g in gaps if g.objective_id == objective_id.upper()]

    return gaps

@router.get(
    "/assessments/{id}/gaps/summary",
    response_model=GapSummary,
    summary="Get aggregated gap metrics and severity breakdown for executive dashboards",
)
async def get_assessment_gaps_summary(
    id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns total counts, type breakdown, severity breakdown, and objective distribution."""
    return await gap_analysis_service.get_gap_summary(db, id, current_user.tenant_id)
