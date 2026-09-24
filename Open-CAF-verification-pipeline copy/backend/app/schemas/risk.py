"""Pydantic schemas for Risk Prioritization & Council Impact Matrix."""
from uuid import UUID
from typing import Optional, List, Dict
import enum
from pydantic import BaseModel, Field, ConfigDict

from app.models.assessment import OutcomeStatus
from app.models.council_service import ServiceTier
from app.schemas.gap import GapTypeEnum, GapSeverityEnum, UnmetIGPItem


class RiskLevelEnum(str, enum.Enum):
    CRITICAL = "CRITICAL"  # Priority score >= 75 (14-day SLA)
    HIGH = "HIGH"          # Priority score 50 - 74 (45-day SLA)
    MEDIUM = "MEDIUM"      # Priority score 25 - 49 (90-day SLA)
    LOW = "LOW"            # Priority score < 25 (180-day SLA)


class PrioritizedRiskItem(BaseModel):
    id: str = Field(..., description="Unique deterministic risk identifier (e.g. risk-{gap_id}-{service_id})")
    rank: int = Field(..., description="Risk priority ranking (1 = most critical)")
    assessment_id: UUID
    outcome_id: str = Field(..., description="NCSC CAF Contributing Outcome code (e.g. B2.a)")
    outcome_title: str
    principle_id: str = Field(..., description="CAF Principle code (e.g. B2)")
    objective_id: str = Field(..., description="CAF Objective (A, B, C, D)")
    gap_id: str
    gap_type: GapTypeEnum
    gap_title: str
    deficit_description: str
    recommendation: str

    # Scoring Factors
    gap_severity_score: int = Field(..., ge=1, le=5, description="Gap severity rating from 1 to 5")
    gap_severity_level: GapSeverityEnum
    gap_severity_rationale: str
    threat_likelihood_score: int = Field(..., ge=1, le=3, description="UK local authority threat likelihood (1-3)")
    threat_likelihood_vector: str

    # Impacted Council Service
    impacted_service_id: Optional[UUID] = None
    impacted_service_name: str
    impacted_service_tier: ServiceTier
    service_criticality_weight: float = Field(..., description="Weight multiplier (3.0 for T1, 2.0 for T2, 1.0 for T3)")

    # Outputs
    priority_score: float = Field(..., ge=0.0, le=100.0, description="Normalized Priority Score from 0 to 100")
    risk_level: RiskLevelEnum
    suggested_sla_days: int = Field(..., description="Remediation target SLA in calendar days (14, 45, 90, 180)")
    suggested_sla_label: str = Field(..., description="Human-readable SLA target (e.g. '14 days')")

    # Status & Evidence
    evaluated_status: OutcomeStatus
    unmet_igps: List[UnmetIGPItem] = []
    is_stale_evidence: bool = False
    evidence_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PrioritizedRiskSummary(BaseModel):
    assessment_id: UUID
    total_risks: int
    critical_risks_count: int
    high_risks_count: int
    medium_risks_count: int
    low_risks_count: int
    evidential_gaps_count: int
    affected_tier_1_services_count: int
    heatmap_distribution: Dict[str, int] = Field(
        default_factory=dict,
        description="Quadrant counts: L{1-3}_I{1-3} representing Likelihood (1-3) vs Service Impact (1-3)",
    )
    risks: List[PrioritizedRiskItem]
