"""Pydantic Schemas for CAF Assessments, Outcomes, and Score Summaries."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime

from app.models.assessment import AssessmentStatus, OutcomeStatus
from app.models.caf import IGPLevel

class AssessmentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="e.g. 2026 Q1 Local Government Assurance")
    scope_description: str = Field(..., min_length=10, description="Systems, networks, and services within scope")
    council_service_name: Optional[str] = Field(None, max_length=255, description="e.g. Adult Social Care Systems")

class AssessmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    scope_description: Optional[str] = None
    status: Optional[AssessmentStatus] = None
    council_service_name: Optional[str] = None

class OutcomeEvaluationUpdate(BaseModel):
    status: OutcomeStatus
    assessor_rationale: Optional[str] = None
    reviewer_notes: Optional[str] = None
    satisfied_igp_ids: Optional[List[UUID]] = None

class IGPCheckResponse(BaseModel):
    igp_id: UUID
    level: IGPLevel
    description: str
    sort_order: int
    is_satisfied: bool

    model_config = ConfigDict(from_attributes=True)

class AssessmentOutcomeResponse(BaseModel):
    id: UUID
    assessment_id: UUID
    outcome_id: str
    outcome_title: Optional[str] = None
    outcome_description: Optional[str] = None
    principle_id: Optional[str] = None
    objective_id: Optional[str] = None
    status: OutcomeStatus
    assessor_rationale: Optional[str] = None
    reviewer_notes: Optional[str] = None
    assessed_at: Optional[datetime] = None
    igp_checks: List[IGPCheckResponse] = []

    model_config = ConfigDict(from_attributes=True)

class PrincipleScore(BaseModel):
    principle_id: str
    principle_title: str
    total_outcomes: int
    achieved: int
    partially_achieved: int
    not_achieved: int
    not_started: int
    completion_rate: float

class ObjectiveScore(BaseModel):
    objective_id: str
    objective_title: str
    total_outcomes: int
    achieved: int
    partially_achieved: int
    not_achieved: int
    not_started: int
    completion_rate: float
    principles: Dict[str, PrincipleScore] = {}

class ScoreSummary(BaseModel):
    total_outcomes: int = 39
    evaluated_outcomes: int
    remaining_outcomes: int
    completion_rate: float
    overall_achieved_count: int
    overall_achieved_pct: float
    overall_partially_achieved_count: int
    overall_partially_achieved_pct: float
    overall_not_achieved_count: int
    overall_not_achieved_pct: float
    overall_not_started_count: int
    objectives: Dict[str, ObjectiveScore] = {}

class AssessmentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    scope_description: str
    status: AssessmentStatus
    council_service_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    score_summary: Optional[ScoreSummary] = None

    model_config = ConfigDict(from_attributes=True)

class AssessmentDetailResponse(AssessmentResponse):
    outcomes: List[AssessmentOutcomeResponse] = []
