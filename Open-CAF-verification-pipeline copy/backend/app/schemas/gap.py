"""Pydantic schemas for Gap Analysis (Evidential Gaps vs Control Deficits)."""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from uuid import UUID
import enum
from app.models.assessment import OutcomeStatus

class GapTypeEnum(str, enum.Enum):
    EVIDENTIAL_GAP = "EVIDENTIAL_GAP"
    CONTROL_DEFICIT = "CONTROL_DEFICIT"

class GapSeverityEnum(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class UnmetIGPItem(BaseModel):
    igp_id: str
    level: str
    description: str

class GapItem(BaseModel):
    id: str
    assessment_id: UUID
    outcome_id: str
    outcome_title: str
    principle_id: str
    objective_id: str
    gap_type: GapTypeEnum
    severity: GapSeverityEnum
    title: str
    description: str
    recommendation: str
    evaluated_status: OutcomeStatus
    unmet_igps: List[UnmetIGPItem] = []
    is_stale_evidence: bool = False
    evidence_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class GapSummary(BaseModel):
    assessment_id: UUID
    total_gaps: int
    evidential_gaps_count: int
    control_deficits_count: int
    by_severity: Dict[str, int] = {}
    by_objective: Dict[str, Dict[str, int]] = {}
    by_principle: Dict[str, Dict[str, int]] = {}
