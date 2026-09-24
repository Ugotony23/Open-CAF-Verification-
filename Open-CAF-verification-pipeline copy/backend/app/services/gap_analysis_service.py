"""Gap Analysis Service: Heuristic Detection of Evidential Gaps vs Control Deficits."""
from typing import List, Dict, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.assessment import Assessment, AssessmentOutcome, OutcomeStatus, AssessmentIGPCheck
from app.models.evidence import Evidence
from app.models.associations import EvidenceOutcomeLink
from app.models.caf import ContributingOutcome, Principle, Objective, IGP
from app.schemas.gap import (
    GapItem,
    GapSummary,
    GapTypeEnum,
    GapSeverityEnum,
    UnmetIGPItem,
)
from app.services.evidence_service import evidence_service

# NCSC high-priority principles carrying elevated baseline severity
CRITICAL_PRINCIPLES = {"B2", "B4", "B5"}  # Identity, System Security, Backups/Resilience
HIGH_PRINCIPLES = {"A4", "C1", "D1"}       # Supply Chain, Monitoring, Incident Response

class GapAnalysisService:
    @staticmethod
    def determine_severity(
        principle_id: str,
        gap_type: GapTypeEnum,
        outcome_status: OutcomeStatus,
    ) -> GapSeverityEnum:
        """Assigns baseline risk severity based on NCSC principle criticality and evaluation status."""
        if principle_id in CRITICAL_PRINCIPLES:
            if outcome_status == OutcomeStatus.NOT_ACHIEVED:
                return GapSeverityEnum.CRITICAL
            return GapSeverityEnum.HIGH

        if principle_id in HIGH_PRINCIPLES:
            if outcome_status == OutcomeStatus.NOT_ACHIEVED:
                return GapSeverityEnum.HIGH
            return GapSeverityEnum.MEDIUM

        # Standard baseline
        if outcome_status == OutcomeStatus.NOT_ACHIEVED:
            return GapSeverityEnum.MEDIUM
        return GapSeverityEnum.LOW

    @classmethod
    async def detect_gaps(
        cls,
        db: AsyncSession,
        assessment_id: UUID,
        tenant_id: UUID,
    ) -> List[GapItem]:
        """
        Scans all Contributing Outcomes in an assessment and identifies:
        1. EVIDENTIAL_GAP: Claimed Achieved/Partially without fresh proof.
        2. CONTROL_DEFICIT: Evaluated Partially or Not Achieved with unmet IGPs.
        """
        # 1. Validate assessment
        ass_query = select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.tenant_id == tenant_id,
        )
        ass_res = await db.execute(ass_query)
        assessment = ass_res.scalar_one_or_none()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found",
            )

        # 2. Query assessment outcomes with relations
        outcomes_query = (
            select(AssessmentOutcome)
            .where(AssessmentOutcome.assessment_id == assessment_id)
            .options(
                selectinload(AssessmentOutcome.contributing_outcome),
                selectinload(AssessmentOutcome.igp_checks).selectinload(AssessmentIGPCheck.igp),
            )
            .order_by(AssessmentOutcome.outcome_id)
        )
        outcomes_res = await db.execute(outcomes_query)
        outcomes = outcomes_res.scalars().all()

        # 3. Query all tenant evidence links
        links_query = (
            select(EvidenceOutcomeLink, Evidence)
            .join(Evidence, EvidenceOutcomeLink.evidence_id == Evidence.id)
            .where(Evidence.tenant_id == tenant_id)
        )
        links_res = await db.execute(links_query)
        links_data = links_res.all()

        evidence_by_outcome: Dict[str, List[Evidence]] = {}
        for link, ev in links_data:
            evidence_by_outcome.setdefault(link.outcome_id, []).append(ev)

        gaps: List[GapItem] = []

        for out in outcomes:
            code = out.outcome_id
            title = out.contributing_outcome.title if out.contributing_outcome else code
            pr_id = out.contributing_outcome.principle_id if out.contributing_outcome else code.split('.')[0]
            obj_id = pr_id[0]

            linked_ev_list = evidence_by_outcome.get(code, [])
            has_evidence = len(linked_ev_list) > 0
            has_fresh_evidence = any(not evidence_service.is_stale(ev) for ev in linked_ev_list)
            is_stale = has_evidence and not has_fresh_evidence

            # a) Check for EVIDENTIAL_GAP
            # If evaluated as Achieved or Partially Achieved, but lacks fresh proof
            if out.status in (OutcomeStatus.ACHIEVED, OutcomeStatus.PARTIALLY_ACHIEVED) and not has_fresh_evidence:
                severity = cls.determine_severity(pr_id, GapTypeEnum.EVIDENTIAL_GAP, out.status)
                desc = (
                    f"Outcome is evaluated as '{out.status.value}', but all attached evidence is stale (>12 months old) or past validity."
                    if is_stale
                    else f"Outcome is evaluated as '{out.status.value}', but zero supporting evidence documents are attached in the Evidence Vault."
                )
                recommendation = (
                    "Upload fresh annual audit reports, scans, or updated policy documents to substantiate this compliance claim."
                    if is_stale
                    else "Attach independent audits, penetration test results, or policies in the Evidence Vault to substantiate compliance for external auditors."
                )

                gaps.append(
                    GapItem(
                        id=f"gap-ev-{out.id}",
                        assessment_id=assessment_id,
                        outcome_id=code,
                        outcome_title=title,
                        principle_id=pr_id,
                        objective_id=obj_id,
                        gap_type=GapTypeEnum.EVIDENTIAL_GAP,
                        severity=severity,
                        title=f"Evidential Blindspot on {code}: {title}",
                        description=desc,
                        recommendation=recommendation,
                        evaluated_status=out.status,
                        unmet_igps=[],
                        is_stale_evidence=is_stale,
                        evidence_count=len(linked_ev_list),
                    )
                )

            # b) Check for CONTROL_DEFICIT
            # If evaluated as Partially Achieved or Not Achieved
            if out.status in (OutcomeStatus.PARTIALLY_ACHIEVED, OutcomeStatus.NOT_ACHIEVED):
                severity = cls.determine_severity(pr_id, GapTypeEnum.CONTROL_DEFICIT, out.status)

                # Identify unmet IGPs
                unmet: List[UnmetIGPItem] = []
                for check in out.igp_checks:
                    if not check.is_satisfied and check.igp:
                        unmet.append(
                            UnmetIGPItem(
                                igp_id=str(check.igp_id),
                                level=check.igp.level.value,
                                description=check.igp.description,
                            )
                        )

                unmet_desc = (
                    f" {len(unmet)} essential Indicators of Good Practice are currently unsatisfied."
                    if unmet
                    else ""
                )

                gaps.append(
                    GapItem(
                        id=f"gap-cd-{out.id}",
                        assessment_id=assessment_id,
                        outcome_id=code,
                        outcome_title=title,
                        principle_id=pr_id,
                        objective_id=obj_id,
                        gap_type=GapTypeEnum.CONTROL_DEFICIT,
                        severity=severity,
                        title=f"Control Deficit on {code}: {title}",
                        description=f"Outcome is evaluated as '{out.status.value}'.{unmet_desc}",
                        recommendation="Implement technical controls, policy updates, and staff workflows satisfying the required CAF Indicators of Good Practice.",
                        evaluated_status=out.status,
                        unmet_igps=unmet,
                        is_stale_evidence=is_stale,
                        evidence_count=len(linked_ev_list),
                    )
                )

        return gaps

    @classmethod
    async def get_gap_summary(
        cls,
        db: AsyncSession,
        assessment_id: UUID,
        tenant_id: UUID,
    ) -> GapSummary:
        """Returns aggregated breakdown of detected gaps by type, severity, and framework hierarchy."""
        gaps = await cls.detect_gaps(db, assessment_id, tenant_id)

        evidential_count = sum(1 for g in gaps if g.gap_type == GapTypeEnum.EVIDENTIAL_GAP)
        deficit_count = sum(1 for g in gaps if g.gap_type == GapTypeEnum.CONTROL_DEFICIT)

        by_severity: Dict[str, int] = {
            GapSeverityEnum.CRITICAL.value: 0,
            GapSeverityEnum.HIGH.value: 0,
            GapSeverityEnum.MEDIUM.value: 0,
            GapSeverityEnum.LOW.value: 0,
        }
        by_objective: Dict[str, Dict[str, int]] = {}
        by_principle: Dict[str, Dict[str, int]] = {}

        for g in gaps:
            by_severity[g.severity.value] = by_severity.get(g.severity.value, 0) + 1

            # Objective breakdown
            by_objective.setdefault(g.objective_id, {"evidential": 0, "deficit": 0, "total": 0})
            by_objective[g.objective_id]["total"] += 1
            if g.gap_type == GapTypeEnum.EVIDENTIAL_GAP:
                by_objective[g.objective_id]["evidential"] += 1
            else:
                by_objective[g.objective_id]["deficit"] += 1

            # Principle breakdown
            by_principle.setdefault(g.principle_id, {"evidential": 0, "deficit": 0, "total": 0})
            by_principle[g.principle_id]["total"] += 1
            if g.gap_type == GapTypeEnum.EVIDENTIAL_GAP:
                by_principle[g.principle_id]["evidential"] += 1
            else:
                by_principle[g.principle_id]["deficit"] += 1

        return GapSummary(
            assessment_id=assessment_id,
            total_gaps=len(gaps),
            evidential_gaps_count=evidential_count,
            control_deficits_count=deficit_count,
            by_severity=by_severity,
            by_objective=by_objective,
            by_principle=by_principle,
        )

gap_analysis_service = GapAnalysisService()
