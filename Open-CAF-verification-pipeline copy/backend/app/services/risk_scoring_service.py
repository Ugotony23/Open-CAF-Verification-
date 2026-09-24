"""Risk Prioritization Algorithm & Council Impact Matrix Service."""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.assessment import Assessment, OutcomeStatus
from app.models.council_service import CouncilService, ServiceTier, TIER_WEIGHTS
from app.schemas.gap import GapItem, GapTypeEnum, GapSeverityEnum
from app.schemas.risk import (
    PrioritizedRiskItem,
    PrioritizedRiskSummary,
    RiskLevelEnum,
)
from app.services.gap_analysis_service import GapAnalysisService


class RiskScoringService:
    """
    Council Risk Prioritization Engine:
    Formula:
        Priority Score (0-100) = Normalized [ Gap Severity (1-5) x Service Criticality Weight (1.0-3.0) x Threat Likelihood (1-3) ]
    Maximum raw score: 5 x 3.0 x 3 = 45.0.
    """

    @staticmethod
    def calculate_risk_score(
        gap_severity: int,
        service_weight: float,
        threat_likelihood: int,
    ) -> Tuple[float, RiskLevelEnum, int, str]:
        """
        Calculates normalized priority score (0-100), risk tier, and remediation SLA.
        """
        raw_score = float(gap_severity) * float(service_weight) * float(threat_likelihood)
        # Normalization over max potential score of 45.0
        priority_score = round(min(100.0, max(0.0, (raw_score / 45.0) * 100.0)), 1)

        if priority_score >= 75.0:
            level = RiskLevelEnum.CRITICAL
            sla_days = 14
            sla_label = "14 days"
        elif priority_score >= 50.0:
            level = RiskLevelEnum.HIGH
            sla_days = 45
            sla_label = "45 days"
        elif priority_score >= 25.0:
            level = RiskLevelEnum.MEDIUM
            sla_days = 90
            sla_label = "90 days"
        else:
            level = RiskLevelEnum.LOW
            sla_days = 180
            sla_label = "180 days"

        return priority_score, level, sla_days, sla_label

    @staticmethod
    def get_gap_severity(gap: GapItem) -> Tuple[int, str]:
        """
        Maps a gap into a 1-5 severity rating based on NCSC CAF principle criticality
        and technical vs evidential deficit nature.
        """
        # Material technical deficit in core security perimeters: B2 (Identity), B4 (System Security), D1 (Response)
        if gap.gap_type == GapTypeEnum.CONTROL_DEFICIT:
            if gap.principle_id in {"B2", "B4", "D1"}:
                if gap.evaluated_status == OutcomeStatus.NOT_ACHIEVED:
                    return 5, "Material technical deficit in core security perimeter (B2/B4/D1) - Not Achieved"
                return 4, "Significant operational deficit in core security perimeter (B2/B4/D1) - Partially Achieved"

            if gap.principle_id in {"B1", "B3", "B5", "C1", "C2"}:
                if gap.evaluated_status == OutcomeStatus.NOT_ACHIEVED:
                    return 4, "Significant operational deficit in defense, data protection, or monitoring"
                return 3, "Partial operational deficit in defensive security controls"

            if gap.principle_id in {"A2", "A3", "A4"}:
                return 3, "Moderate risk management, asset tracking, or supply chain deficit"

            return 2, "Minor governance framework process deficit"

        # Evidential gaps
        if gap.gap_type == GapTypeEnum.EVIDENTIAL_GAP:
            if gap.principle_id in {"B2", "B4", "B5", "D1"}:
                return 4 if gap.is_stale_evidence else 3, "Evidential blindspot on core perimeter protection"
            if gap.principle_id in {"B1", "B3", "C1", "C2", "A4"}:
                return 2, "Unsubstantiated operational control"
            return 1, "Minor documentation or evidentiary deficit"

        return 2, "Standard baseline gap"

    @staticmethod
    def get_threat_likelihood(principle_id: str, gap_type: GapTypeEnum) -> Tuple[int, str]:
        """
        Determines threat likelihood (1-3) informed by the UK local government threat landscape:
        3 = Prevalent attack vectors (Ransomware, Edge VPN/Gateway exploits, Phishing & MFA bypass)
        2 = Moderate threat vectors (Data exfiltration, Credential stuffing, Supply chain compromise)
        1 = Low immediate exploitability (Governance & procedural documentation)
        """
        if principle_id in {"B2", "B4", "B5", "D1"}:
            if principle_id == "B2":
                vector = "Phishing & Credential Theft (High prevalence against council accounts; MFA absence)"
            elif principle_id == "B4":
                vector = "Edge Gateway & Firewall Exploitation (Active targeting of internet-facing council systems)"
            elif principle_id == "B5":
                vector = "Ransomware Lateral Movement & Backup Encryption (High threat to council IT recovery)"
            else:
                vector = "Ransomware Outage & Incident Escalation (Inability to contain live compromise)"
            return 3, vector

        if principle_id in {"B1", "B3", "C1", "C2", "A4"}:
            if principle_id == "A4":
                vector = "Supply Chain Breach (Exploitation of external software and IT contractors)"
            elif principle_id == "B3":
                vector = "Data Exfiltration & GDPR Breach (Unauthorized transfer of citizen data)"
            elif principle_id == "C1":
                vector = "Undetected Intrusion (Lack of centralized SIEM / 24/7 security log monitoring)"
            else:
                vector = "Vulnerability Exploitation (Unpatched internal endpoints or application flaws)"
            return 2, vector

        return 1, "Internal Governance & Compliance Process (Low direct threat vector exploitability)"

    @classmethod
    async def prioritize_assessment_risks(
        cls,
        db: AsyncSession,
        assessment_id: UUID,
        tenant_id: UUID,
        service_id: Optional[UUID] = None,
        tier: Optional[ServiceTier] = None,
        risk_level: Optional[RiskLevelEnum] = None,
        gap_type: Optional[GapTypeEnum] = None,
        objective_id: Optional[str] = None,
    ) -> PrioritizedRiskSummary:
        """
        Executes the council risk prioritization algorithm across all detected gaps
        and active council services.
        """
        # 1. Fetch gaps for this assessment
        gaps: List[GapItem] = await GapAnalysisService.detect_gaps(
            db=db,
            assessment_id=assessment_id,
            tenant_id=tenant_id,
        )

        # 2. Fetch active council services for the tenant
        services_query = select(CouncilService).filter_by(
            tenant_id=tenant_id,
            is_active=True,
        )
        if service_id is not None:
            services_query = services_query.filter(CouncilService.id == service_id)
        if tier is not None:
            services_query = services_query.filter(CouncilService.tier == tier)

        services_query = services_query.order_by(CouncilService.tier.asc(), CouncilService.name.asc())
        services_res = await db.execute(services_query)
        services = list(services_res.scalars().all())

        # If no custom services configured yet, use standard catalog weights as fallback
        if not services:
            import uuid as _uuid
            services = [
                CouncilService(
                    id=_uuid.uuid4(),
                    tenant_id=tenant_id,
                    name="Default Council Core Operations",
                    tier=ServiceTier.TIER_1,
                    weight_multiplier=3.0,
                    is_active=True,
                )
            ]

        # 3. Compute risk items across (gap x service)
        risk_items: List[PrioritizedRiskItem] = []

        # Track 3x3 heatmap distribution (Likelihood 1-3 vs Impact 1-3)
        heatmap_counts: Dict[str, int] = {
            f"L{l}_I{i}": 0 for l in (1, 2, 3) for i in (1, 2, 3)
        }

        for gap in gaps:
            if gap_type is not None and gap.gap_type != gap_type:
                continue
            if objective_id is not None and gap.objective_id != objective_id:
                continue

            gap_sev_score, gap_sev_rationale = cls.get_gap_severity(gap)
            threat_lik_score, threat_lik_vector = cls.get_threat_likelihood(gap.principle_id, gap.gap_type)

            for svc in services:
                svc_weight = svc.weight_multiplier or TIER_WEIGHTS.get(svc.tier, 1.0)
                priority_score, level, sla_days, sla_label = cls.calculate_risk_score(
                    gap_severity=gap_sev_score,
                    service_weight=svc_weight,
                    threat_likelihood=threat_lik_score,
                )

                if risk_level is not None and level != risk_level:
                    continue

                # Heatmap coordinates: Likelihood (1-3) vs Service Impact (1-3: T3=1, T2=2, T1=3)
                impact_score = 3 if svc.tier == ServiceTier.TIER_1 else (2 if svc.tier == ServiceTier.TIER_2 else 1)
                quadrant_key = f"L{threat_lik_score}_I{impact_score}"
                heatmap_counts[quadrant_key] = heatmap_counts.get(quadrant_key, 0) + 1

                # Ensure valid UUID for impacted_service_id
                svc_uuid = svc.id
                if svc_uuid is not None and isinstance(svc_uuid, str):
                    import uuid as _uuid
                    try:
                        svc_uuid = _uuid.UUID(svc_uuid)
                    except Exception:
                        svc_uuid = None

                risk_items.append(
                    PrioritizedRiskItem(
                        id=f"risk-{gap.id}-{svc_uuid or 'global'}",
                        rank=0,  # Will be assigned after sorting
                        assessment_id=assessment_id,
                        outcome_id=gap.outcome_id,
                        outcome_title=gap.outcome_title,
                        principle_id=gap.principle_id,
                        objective_id=gap.objective_id,
                        gap_id=gap.id,
                        gap_type=gap.gap_type,
                        gap_title=gap.title,
                        deficit_description=gap.description,
                        recommendation=gap.recommendation,
                        gap_severity_score=gap_sev_score,
                        gap_severity_level=gap.severity,
                        gap_severity_rationale=gap_sev_rationale,
                        threat_likelihood_score=threat_lik_score,
                        threat_likelihood_vector=threat_lik_vector,
                        impacted_service_id=svc_uuid,
                        impacted_service_name=svc.name,
                        impacted_service_tier=svc.tier,
                        service_criticality_weight=svc_weight,
                        priority_score=priority_score,
                        risk_level=level,
                        suggested_sla_days=sla_days,
                        suggested_sla_label=sla_label,
                        evaluated_status=gap.evaluated_status,
                        unmet_igps=gap.unmet_igps,
                        is_stale_evidence=gap.is_stale_evidence,
                        evidence_count=gap.evidence_count,
                    )
                )

        # 4. Sort descending by Priority Score, then Gap Severity, then Threat Likelihood
        risk_items.sort(
            key=lambda r: (r.priority_score, r.gap_severity_score, r.threat_likelihood_score),
            reverse=True,
        )

        # Assign ranks
        for idx, item in enumerate(risk_items, start=1):
            item.rank = idx

        # Aggregate counts
        crit_count = sum(1 for r in risk_items if r.risk_level == RiskLevelEnum.CRITICAL)
        high_count = sum(1 for r in risk_items if r.risk_level == RiskLevelEnum.HIGH)
        med_count = sum(1 for r in risk_items if r.risk_level == RiskLevelEnum.MEDIUM)
        low_count = sum(1 for r in risk_items if r.risk_level == RiskLevelEnum.LOW)
        ev_count = sum(1 for r in risk_items if r.gap_type == GapTypeEnum.EVIDENTIAL_GAP)

        # Count distinct Tier 1 services affected by Critical or High risks
        tier1_services_affected = {
            r.impacted_service_id
            for r in risk_items
            if r.impacted_service_tier == ServiceTier.TIER_1 and r.risk_level in (RiskLevelEnum.CRITICAL, RiskLevelEnum.HIGH)
        }

        return PrioritizedRiskSummary(
            assessment_id=assessment_id,
            total_risks=len(risk_items),
            critical_risks_count=crit_count,
            high_risks_count=high_count,
            medium_risks_count=med_count,
            low_risks_count=low_count,
            evidential_gaps_count=ev_count,
            affected_tier_1_services_count=len(tier1_services_affected),
            heatmap_distribution=heatmap_counts,
            risks=risk_items,
        )
