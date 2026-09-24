"""REST API Router for Cyber Risk Prioritization & Council Impact Matrix."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.council_service import ServiceTier
from app.schemas.gap import GapTypeEnum
from app.schemas.risk import (
    PrioritizedRiskSummary,
    RiskLevelEnum,
)
from app.api.deps import get_current_active_user
from app.services.risk_scoring_service import RiskScoringService

router = APIRouter(prefix="/assessments", tags=["Risk Prioritization"])


@router.get(
    "/{assessment_id}/prioritized-risks",
    response_model=PrioritizedRiskSummary,
    status_code=status.HTTP_200_OK,
    summary="Get ranked list of cyber risks sorted by priority score descending",
)
async def get_prioritized_risks(
    assessment_id: UUID,
    service_id: Optional[UUID] = Query(None, description="Filter by specific council service"),
    tier: Optional[ServiceTier] = Query(None, description="Filter by service criticality tier (TIER_1, TIER_2, TIER_3)"),
    risk_level: Optional[RiskLevelEnum] = Query(None, description="Filter by risk rating (CRITICAL, HIGH, MEDIUM, LOW)"),
    gap_type: Optional[GapTypeEnum] = Query(None, description="Filter by gap type (CONTROL_DEFICIT, EVIDENTIAL_GAP)"),
    objective_id: Optional[str] = Query(None, description="Filter by CAF Objective (A, B, C, D)"),
    limit: Optional[int] = Query(None, ge=1, le=500, description="Limit number of returned risk items"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes the UK Local Authority Risk Prioritization Algorithm:
    - Multiplies Gap Severity (1-5) by Service Criticality Weight (1.0-3.0) by Threat Likelihood (1-3).
    - Returns ranked list of risks sorted by priority score descending (0-100),
      along with 3x3 heatmap coordinates, suggested SLAs, and affected Tier 1 services.
    """
    summary = await RiskScoringService.prioritize_assessment_risks(
        db=db,
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
        service_id=service_id,
        tier=tier,
        risk_level=risk_level,
        gap_type=gap_type,
        objective_id=objective_id,
    )

    if limit is not None and limit < len(summary.risks):
        summary.risks = summary.risks[:limit]

    return summary
