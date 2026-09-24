"""CAF Assessment Engine REST Endpoints."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User, UserRole
from app.services.assessment_service import AssessmentService
from app.services.evidence_service import evidence_service
from app.schemas.evidence import EvidenceCoverageResponse
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentResponse,
    AssessmentDetailResponse,
    AssessmentOutcomeResponse,
    OutcomeEvaluationUpdate,
    ScoreSummary,
    IGPCheckResponse,
)

router = APIRouter(prefix="/assessments", tags=["Assessments"])

@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all assessments for the authenticated user's council tenant."""
    assessments = await AssessmentService.list_assessments(db, current_user.tenant_id)
    response_list = []
    for ass in assessments:
        scores = await AssessmentService.calculate_assessment_scores(db, ass.id, current_user.tenant_id)
        ass_dict = AssessmentResponse.model_validate(ass)
        ass_dict.score_summary = scores
        response_list.append(ass_dict)
    return response_list

@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    payload: AssessmentCreate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new assessment and initializes all 39 Contributing Outcomes
    in NOT_STARTED status with all associated IGP criteria.
    """
    assessment = await AssessmentService.create_assessment(db, current_user.tenant_id, payload)
    scores = await AssessmentService.calculate_assessment_scores(db, assessment.id, current_user.tenant_id)
    resp = AssessmentResponse.model_validate(assessment)
    resp.score_summary = scores
    return resp

@router.get("/{id}", response_model=AssessmentDetailResponse)
async def get_assessment(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full assessment details, outcomes tree, and scoring metrics."""
    assessment = await AssessmentService.get_assessment(db, id, current_user.tenant_id)
    scores = await AssessmentService.calculate_assessment_scores(db, id, current_user.tenant_id)

    outcomes_response: List[AssessmentOutcomeResponse] = []
    for out in assessment.outcomes:
        checks = [
            IGPCheckResponse(
                igp_id=c.igp_id,
                level=c.igp.level,
                description=c.igp.description,
                sort_order=c.igp.sort_order,
                is_satisfied=c.is_satisfied,
            )
            for c in out.igp_checks
        ]
        outcomes_response.append(
            AssessmentOutcomeResponse(
                id=out.id,
                assessment_id=out.assessment_id,
                outcome_id=out.outcome_id,
                outcome_title=out.contributing_outcome.title if out.contributing_outcome else None,
                outcome_description=out.contributing_outcome.description if out.contributing_outcome else None,
                principle_id=out.contributing_outcome.principle_id if out.contributing_outcome else None,
                status=out.status,
                assessor_rationale=out.assessor_rationale,
                reviewer_notes=out.reviewer_notes,
                assessed_at=out.assessed_at,
                igp_checks=checks,
            )
        )

    resp = AssessmentDetailResponse(
        id=assessment.id,
        tenant_id=assessment.tenant_id,
        title=assessment.title,
        scope_description=assessment.scope_description,
        status=assessment.status,
        council_service_name=assessment.council_service_name,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
        score_summary=scores,
        outcomes=outcomes_response,
    )
    return resp

@router.get("/{id}/outcomes/{outcome_id}", response_model=AssessmentOutcomeResponse)
async def get_outcome_evaluation(
    id: uuid.UUID,
    outcome_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a single Contributing Outcome evaluation with its IGPs and checks."""
    # Ensure assessment belongs to tenant
    await AssessmentService.get_assessment(db, id, current_user.tenant_id)

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from fastapi import HTTPException
    from app.models.assessment import AssessmentOutcome, AssessmentIGPCheck

    res = await db.execute(
        select(AssessmentOutcome)
        .filter_by(assessment_id=id, outcome_id=outcome_id)
        .options(
            selectinload(AssessmentOutcome.igp_checks).selectinload(AssessmentIGPCheck.igp),
            selectinload(AssessmentOutcome.contributing_outcome),
        )
    )
    target = res.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail=f"Outcome '{outcome_id}' not found")

    checks = [
        IGPCheckResponse(
            igp_id=c.igp_id,
            level=c.igp.level,
            description=c.igp.description,
            sort_order=c.igp.sort_order,
            is_satisfied=c.is_satisfied,
        )
        for c in target.igp_checks
    ]
    return AssessmentOutcomeResponse(
        id=target.id,
        assessment_id=target.assessment_id,
        outcome_id=target.outcome_id,
        outcome_title=target.contributing_outcome.title if target.contributing_outcome else None,
        outcome_description=target.contributing_outcome.description if target.contributing_outcome else None,
        principle_id=target.contributing_outcome.principle_id if target.contributing_outcome else None,
        status=target.status,
        assessor_rationale=target.assessor_rationale,
        reviewer_notes=target.reviewer_notes,
        assessed_at=target.assessed_at,
        igp_checks=checks,
    )

@router.patch("/{id}/outcomes/{outcome_id}", response_model=AssessmentOutcomeResponse)
async def update_outcome_evaluation(
    id: uuid.UUID,
    outcome_id: str,
    payload: OutcomeEvaluationUpdate,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """Updates an outcome's evaluation status, rationale, and checked IGPs."""
    updated = await AssessmentService.update_outcome_evaluation(
        db, id, outcome_id, payload, current_user.tenant_id
    )
    checks = [
        IGPCheckResponse(
            igp_id=c.igp_id,
            level=c.igp.level,
            description=c.igp.description,
            sort_order=c.igp.sort_order,
            is_satisfied=c.is_satisfied,
        )
        for c in updated.igp_checks
    ]
    return AssessmentOutcomeResponse(
        id=updated.id,
        assessment_id=updated.assessment_id,
        outcome_id=updated.outcome_id,
        outcome_title=updated.contributing_outcome.title if updated.contributing_outcome else None,
        outcome_description=updated.contributing_outcome.description if updated.contributing_outcome else None,
        principle_id=updated.contributing_outcome.principle_id if updated.contributing_outcome else None,
        status=updated.status,
        assessor_rationale=updated.assessor_rationale,
        reviewer_notes=updated.reviewer_notes,
        assessed_at=updated.assessed_at,
        igp_checks=checks,
    )

@router.get("/{id}/score-summary", response_model=ScoreSummary)
async def get_score_summary(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns pre-calculated compliance radar and maturity summary metrics."""
    return await AssessmentService.calculate_assessment_scores(db, id, current_user.tenant_id)

@router.get("/{id}/coverage", response_model=EvidenceCoverageResponse)
async def get_assessment_coverage(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculates evidence coverage percentage across Principles A1-D2 and Objectives A-D."""
    return await evidence_service.get_assessment_evidence_coverage(
        db=db,
        assessment_id=id,
        tenant_id=current_user.tenant_id,
    )
