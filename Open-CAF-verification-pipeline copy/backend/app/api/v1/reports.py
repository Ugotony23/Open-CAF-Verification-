"""API Endpoints for Executive Cabinet Briefing and Audit Pack PDF Reports."""
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.assessment import Assessment
from app.models.tenant import CouncilTenant
from app.reports.pdf_generator import PDFGenerator
from app.services.assessment_service import AssessmentService
from app.services.risk_scoring_service import RiskScoringService
from app.services.remediation_service import RemediationService
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Executive Reports & PDF Generator"])


@router.get(
    "/{assessment_id}/executive-pdf",
    summary="Generate and stream 2-page Executive Cabinet Briefing PDF",
    response_class=Response,
)
async def get_executive_briefing_pdf(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Renders a concise, highly-styled 2-page Executive Cabinet Cyber Resilience Briefing PDF
    for Council Chief Executive, Section 151 Officer, and Cabinet Members.
    """
    # 1. Ownership validation
    ass_res = await db.execute(
        select(Assessment).filter_by(id=assessment_id, tenant_id=current_user.tenant_id)
    )
    assessment = ass_res.scalars().first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found or does not belong to your council",
        )

    pdf_bytes = await PDFGenerator.generate_executive_briefing_pdf(
        db=db,
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
    )

    filename = f"OpenCAF_Executive_Cabinet_Briefing_{assessment_id}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get(
    "/{assessment_id}/audit-pdf",
    summary="Generate and stream Detailed Assurance & Audit Pack PDF",
    response_class=Response,
)
async def get_assurance_audit_pdf(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Renders a comprehensive Assurance & Audit Pack PDF covering all 39 Contributing
    Outcomes, checked IGPs, assessor rationales, and cryptographic evidence citations.
    """
    # 1. Ownership validation
    ass_res = await db.execute(
        select(Assessment).filter_by(id=assessment_id, tenant_id=current_user.tenant_id)
    )
    assessment = ass_res.scalars().first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found or does not belong to your council",
        )

    pdf_bytes = await PDFGenerator.generate_audit_pack_pdf(
        db=db,
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
    )

    filename = f"OpenCAF_Audit_Pack_{assessment_id}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get(
    "/{assessment_id}/summary",
    summary="Get high-level summary metrics for executive report preview",
)
async def get_report_preview_summary(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns aggregated metadata and metrics for report preview UI."""
    ass_res = await db.execute(
        select(Assessment).filter_by(id=assessment_id, tenant_id=current_user.tenant_id)
    )
    assessment = ass_res.scalars().first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found or does not belong to your council",
        )

    council = await db.get(CouncilTenant, current_user.tenant_id)
    scores = await AssessmentService.calculate_assessment_scores(
        db=db,
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
    )
    risks = await RiskScoringService.prioritize_assessment_risks(
        db=db,
        assessment_id=assessment_id,
        tenant_id=current_user.tenant_id,
    )
    remediation = await RemediationService.get_remediation_summary(
        db=db,
        tenant_id=current_user.tenant_id,
        assessment_id=assessment_id,
    )

    return {
        "assessment_id": str(assessment_id),
        "assessment_title": assessment.title,
        "council_name": council.name if council else "Council",
        "scores": scores,
        "critical_risks_count": risks.critical_risks_count,
        "total_risks_count": risks.total_risks,
        "total_remediation_budget_gbp": remediation.total_budget_required_gbp,
        "total_remediation_effort_hours": getattr(remediation, "total_estimated_effort_hours", 0.0),
        "total_remediation_tasks": remediation.total_tasks,
    }
