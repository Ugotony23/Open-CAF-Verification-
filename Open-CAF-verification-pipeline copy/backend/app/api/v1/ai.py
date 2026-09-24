"""REST API Endpoints for Open CAF AI Copilot (Human-in-the-Loop)."""
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.ai_suggestion import AISuggestion, SuggestionType, SuggestionStatus
from app.schemas.ai import (
    SuggestMappingRequest,
    GapCritiqueRequest,
    DraftRemediationRequest,
    RejectSuggestionRequest,
    AISuggestionResponse,
)
from app.api.deps import get_current_active_user, require_role
from app.ai.copilot import AICopilotService

router = APIRouter(prefix="/ai", tags=["Assistive AI Copilot"])


@router.post(
    "/suggest-mappings/{evidence_id}",
    response_model=AISuggestionResponse,
    summary="Suggest NCSC CAF Outcome mappings with citations (PENDING_REVIEW)",
)
async def suggest_evidence_mappings(
    evidence_id: uuid.UUID,
    payload: Optional[SuggestMappingRequest] = Body(default=None),
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Scans evidence document, applies privacy-preserving redaction, and proposes top-3
    Contributing Outcome mappings with citations. Saved in PENDING_REVIEW.
    """
    assessment_id = payload.assessment_id if payload else None
    return await AICopilotService.suggest_evidence_mappings(
        db=db,
        tenant_id=current_user.tenant_id,
        evidence_id=evidence_id,
        assessment_id=assessment_id,
    )


@router.post(
    "/critique-gap",
    response_model=AISuggestionResponse,
    summary="Generate objective assessor gap critique against NCSC IGPs (PENDING_REVIEW)",
)
async def critique_gap(
    payload: GapCritiqueRequest,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Critiques council policies and technical evidence against NCSC IGP requirements.
    Saved in PENDING_REVIEW. Assessment rationale is untouched until accepted.
    """
    return await AICopilotService.critique_outcome_gap(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=payload.assessment_id,
        outcome_id=payload.outcome_id,
        evidence_ids=payload.evidence_ids,
    )


@router.post(
    "/draft-remediation",
    response_model=AISuggestionResponse,
    summary="Draft remediation action with budget, effort & steps (PENDING_REVIEW)",
)
async def draft_remediation(
    payload: DraftRemediationRequest,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
):
    """
    Drafts an action item with title, steps, hours, and £ GBP cost estimate.
    Saved in PENDING_REVIEW. No RemediationTask is created until accepted.
    """
    return await AICopilotService.draft_remediation_action(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=payload.assessment_id,
        gap_id=payload.gap_id,
        outcome_id=payload.outcome_id,
    )


@router.get(
    "/suggestions",
    response_model=List[AISuggestionResponse],
    summary="List AI Copilot suggestions",
)
async def list_suggestions(
    assessment_id: Optional[uuid.UUID] = Query(None),
    evidence_id: Optional[uuid.UUID] = Query(None),
    status: Optional[SuggestionStatus] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists Copilot suggestions scoped to tenant."""
    return await AICopilotService.list_suggestions(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment_id,
        evidence_id=evidence_id,
        status_filter=status,
    )


@router.get(
    "/suggestions/{suggestion_id}",
    response_model=AISuggestionResponse,
    summary="Get single AI Copilot suggestion",
)
async def get_suggestion(
    suggestion_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves a single suggestion."""
    res = await db.execute(
        select(AISuggestion).filter_by(id=suggestion_id, tenant_id=current_user.tenant_id)
    )
    sugg = res.scalars().first()
    if not sugg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Suggestion not found")
    return sugg


@router.post(
    "/suggestions/{suggestion_id}/accept",
    summary="Human-in-the-Loop: Accept AI suggestion and apply to assessment",
)
async def accept_suggestion(
    suggestion_id: uuid.UUID,
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Applies the recommendation to live records:
    - EVIDENCE_MAPPING -> Creates EvidenceOutcomeLink
    - GAP_CRITIQUE -> Updates AssessmentOutcome rationale
    - REMEDIATION_ACTION -> Creates RemediationTask
    """
    return await AICopilotService.accept_suggestion(
        db=db,
        tenant_id=current_user.tenant_id,
        suggestion_id=suggestion_id,
        user_id=current_user.id,
    )


@router.post(
    "/suggestions/{suggestion_id}/reject",
    summary="Human-in-the-Loop: Reject AI suggestion",
)
async def reject_suggestion(
    suggestion_id: uuid.UUID,
    payload: Optional[RejectSuggestionRequest] = Body(default=None),
    current_user: User = Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR])),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Rejects the recommendation. Leaves assessment data unchanged.
    """
    reason = payload.rejection_reason if payload else None
    return await AICopilotService.reject_suggestion(
        db=db,
        tenant_id=current_user.tenant_id,
        suggestion_id=suggestion_id,
        user_id=current_user.id,
        rejection_reason=reason,
    )
