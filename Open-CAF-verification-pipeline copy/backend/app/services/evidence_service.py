"""Evidence Service: Linking, Freshness Analysis, and Assessment Coverage."""
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.evidence import Evidence
from app.models.associations import EvidenceOutcomeLink
from app.models.caf import ContributingOutcome, Principle, Objective, IGP
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.evidence import (
    EvidenceCoverageResponse,
    PrincipleCoverage,
    ObjectiveCoverage,
    EvidenceLinkResponse,
)

class EvidenceService:
    @staticmethod
    def is_stale(evidence: Evidence, ref_date: Optional[date] = None) -> bool:
        """
        Returns True if:
        1. Explicit 'valid_to' date is in the past.
        2. Upload date was more than 365 days ago (annual renewal policy).
        """
        today = ref_date or datetime.now(timezone.utc).date()

        if evidence.valid_to and evidence.valid_to < today:
            return True

        if evidence.created_at:
            created_date = evidence.created_at.date()
            if (today - created_date).days > 365:
                return True

        return False

    @staticmethod
    def is_expiring_soon(evidence: Evidence, days_threshold: int = 60, ref_date: Optional[date] = None) -> bool:
        """
        Returns True if not stale, but will expire within the given days_threshold (default 60 days).
        """
        today = ref_date or datetime.now(timezone.utc).date()

        if EvidenceService.is_stale(evidence, today):
            return False

        if evidence.valid_to:
            remaining_days = (evidence.valid_to - today).days
            if 0 <= remaining_days <= days_threshold:
                return True

        if evidence.created_at:
            age_days = (today - evidence.created_at.date()).days
            days_to_annual_renewal = 365 - age_days
            if 0 <= days_to_annual_renewal <= days_threshold:
                return True

        return False

    @classmethod
    async def link_evidence(
        cls,
        db: AsyncSession,
        evidence_id: UUID,
        outcome_id: str,
        igp_id: Optional[UUID],
        citation_notes: Optional[str],
        user: User,
    ) -> EvidenceOutcomeLink:
        """Links an evidence item to a CAF Contributing Outcome with audit citation."""
        # Verify evidence belongs to user's tenant
        ev_query = select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.tenant_id == user.tenant_id,
        )
        ev_result = await db.execute(ev_query)
        evidence = ev_result.scalar_one_or_none()
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence artifact not found",
            )

        # Verify outcome exists
        out_query = select(ContributingOutcome).where(ContributingOutcome.id == outcome_id)
        out_result = await db.execute(out_query)
        outcome = out_result.scalar_one_or_none()
        if not outcome:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contributing Outcome '{outcome_id}' not found in CAF taxonomy",
            )

        # Verify IGP if supplied
        if igp_id:
            igp_query = select(IGP).where(IGP.id == igp_id, IGP.outcome_id == outcome_id)
            igp_result = await db.execute(igp_query)
            if not igp_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"IGP ID '{igp_id}' does not belong to outcome '{outcome_id}'",
                )

        # Check existing link
        existing_query = select(EvidenceOutcomeLink).where(
            EvidenceOutcomeLink.evidence_id == evidence_id,
            EvidenceOutcomeLink.outcome_id == outcome_id,
            EvidenceOutcomeLink.igp_id == igp_id if igp_id else EvidenceOutcomeLink.igp_id.is_(None),
        )
        existing_result = await db.execute(existing_query)
        link = existing_result.scalar_one_or_none()

        if link:
            link.citation_notes = citation_notes
            link.linked_by_user_id = user.id
            link.linked_at = datetime.now(timezone.utc)
        else:
            link = EvidenceOutcomeLink(
                evidence_id=evidence_id,
                outcome_id=outcome_id,
                igp_id=igp_id,
                citation_notes=citation_notes,
                linked_by_user_id=user.id,
            )
            db.add(link)

        await db.commit()
        await db.refresh(link)
        return link

    @classmethod
    async def unlink_evidence(
        cls,
        db: AsyncSession,
        evidence_id: UUID,
        outcome_id: str,
        tenant_id: UUID,
    ) -> bool:
        """Removes all links between an evidence artifact and a specified outcome."""
        ev_query = select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.tenant_id == tenant_id,
        )
        ev_result = await db.execute(ev_query)
        evidence = ev_result.scalar_one_or_none()
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence artifact not found",
            )

        links_query = select(EvidenceOutcomeLink).where(
            EvidenceOutcomeLink.evidence_id == evidence_id,
            EvidenceOutcomeLink.outcome_id == outcome_id,
        )
        links_result = await db.execute(links_query)
        links = links_result.scalars().all()

        if not links:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence artifact is not linked to outcome '{outcome_id}'",
            )

        for link in links:
            await db.delete(link)

        await db.commit()
        return True

    @classmethod
    async def get_assessment_evidence_coverage(
        cls,
        db: AsyncSession,
        assessment_id: UUID,
        tenant_id: UUID,
    ) -> EvidenceCoverageResponse:
        """
        Calculates evidence coverage across all 39 Contributing Outcomes for the council assessment.
        Checks freshness (>365 days or expired valid_to).
        """
        # Validate assessment exists
        ass_query = select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.tenant_id == tenant_id,
        )
        ass_result = await db.execute(ass_query)
        assessment = ass_result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found",
            )

        # Query all contributing outcomes with principles and objectives
        outcomes_query = select(ContributingOutcome).order_by(ContributingOutcome.id)
        outcomes_res = await db.execute(outcomes_query)
        all_outcomes = outcomes_res.scalars().all()

        # Query all evidence links for this tenant
        links_query = (
            select(EvidenceOutcomeLink, Evidence)
            .join(Evidence, EvidenceOutcomeLink.evidence_id == Evidence.id)
            .where(Evidence.tenant_id == tenant_id)
        )
        links_res = await db.execute(links_query)
        links_data = links_res.all()

        # Group evidence by outcome_id
        outcome_evidence_map: Dict[str, List[Evidence]] = {}
        for link, evidence in links_data:
            outcome_evidence_map.setdefault(link.outcome_id, []).append(evidence)

        # Track stats
        evidenced_count = 0
        stale_evidenced_count = 0
        unevidenced_count = 0

        principle_stats: Dict[str, Dict[str, int]] = {}
        objective_stats: Dict[str, Dict[str, int]] = {}

        for out in all_outcomes:
            obj_id = out.id.split('.')[0][0]  # 'A', 'B', 'C', 'D'
            pr_id = out.principle_id or out.id.split('.')[0]  # 'A1', 'B2', etc.

            principle_stats.setdefault(pr_id, {"total": 0, "evidenced": 0})
            objective_stats.setdefault(obj_id, {"total": 0, "evidenced": 0})

            principle_stats[pr_id]["total"] += 1
            objective_stats[obj_id]["total"] += 1

            ev_list = outcome_evidence_map.get(out.id, [])
            if not ev_list:
                unevidenced_count += 1
            else:
                # Check if any evidence is fresh
                has_fresh = any(not cls.is_stale(ev) for ev in ev_list)
                if has_fresh:
                    evidenced_count += 1
                    principle_stats[pr_id]["evidenced"] += 1
                    objective_stats[obj_id]["evidenced"] += 1
                else:
                    stale_evidenced_count += 1

        total = len(all_outcomes) or 39
        coverage_rate = round((evidenced_count / total) * 100, 1)

        principles_coverage: Dict[str, PrincipleCoverage] = {}
        for pr_id, stat in principle_stats.items():
            tot = stat["total"]
            ev = stat["evidenced"]
            principles_coverage[pr_id] = PrincipleCoverage(
                principle_id=pr_id,
                total_outcomes=tot,
                evidenced_outcomes=ev,
                coverage_rate=round((ev / tot) * 100, 1) if tot > 0 else 0.0,
            )

        objectives_coverage: Dict[str, ObjectiveCoverage] = {}
        for obj_id, stat in objective_stats.items():
            tot = stat["total"]
            ev = stat["evidenced"]
            objectives_coverage[obj_id] = ObjectiveCoverage(
                objective_id=obj_id,
                total_outcomes=tot,
                evidenced_outcomes=ev,
                coverage_rate=round((ev / tot) * 100, 1) if tot > 0 else 0.0,
            )

        return EvidenceCoverageResponse(
            assessment_id=assessment_id,
            total_outcomes=total,
            evidenced_outcomes=evidenced_count,
            stale_evidenced_outcomes=stale_evidenced_count,
            unevidenced_outcomes=unevidenced_count,
            coverage_rate=coverage_rate,
            principles=principles_coverage,
            objectives=objectives_coverage,
        )

evidence_service = EvidenceService()
