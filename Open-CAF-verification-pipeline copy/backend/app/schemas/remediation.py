"""Pydantic schemas for Remediation Task Management Engine."""
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List, Dict, Any
import enum
from pydantic import BaseModel, Field, ConfigDict

from app.models.remediation import RemediationStatus, RemediationPriority


class TechnicalStepItem(BaseModel):
    step: str
    completed: bool = False


class RemediationTaskBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Remediation action title")
    description: Optional[str] = Field(None, description="Detailed technical or operational implementation steps")
    technical_steps: Optional[List[Any]] = Field(
        default_factory=list,
        description="Structured checklist of technical implementation steps",
    )
    status: RemediationStatus = Field(default=RemediationStatus.BACKLOG)
    priority: RemediationPriority = Field(default=RemediationPriority.HIGH)
    assigned_owner_name: Optional[str] = Field(None, max_length=255)
    assigned_owner_email: Optional[str] = Field(None, max_length=255)
    estimated_effort_hours: float = Field(default=0.0, ge=0.0)
    estimated_cost_gbp: float = Field(default=0.0, ge=0.0)
    target_completion_date: Optional[date] = None
    external_ticket_id: Optional[str] = Field(None, max_length=100, description="Linked Jira / GitHub issue key")


class RemediationTaskCreate(RemediationTaskBase):
    assessment_id: UUID
    outcome_id: str = Field(..., min_length=2, max_length=10, description="Contributing Outcome code, e.g. B2.a")
    gap_id: Optional[str] = None


class RemediationTaskCreateFromGap(BaseModel):
    assessment_id: UUID
    outcome_id: str
    gap_id: Optional[str] = None
    custom_title: Optional[str] = None
    assigned_owner_name: Optional[str] = None
    assigned_owner_email: Optional[str] = None
    estimated_cost_gbp: Optional[float] = None
    estimated_effort_hours: Optional[float] = None
    target_completion_date: Optional[date] = None
    external_ticket_id: Optional[str] = None


class RemediationTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    technical_steps: Optional[List[Any]] = None
    status: Optional[RemediationStatus] = None
    priority: Optional[RemediationPriority] = None
    assigned_owner_name: Optional[str] = None
    assigned_owner_email: Optional[str] = None
    estimated_effort_hours: Optional[float] = Field(None, ge=0.0)
    estimated_cost_gbp: Optional[float] = Field(None, ge=0.0)
    target_completion_date: Optional[date] = None
    external_ticket_id: Optional[str] = None


class RemediationTaskStatusUpdate(BaseModel):
    status: RemediationStatus


class RemediationTaskBatchStatusUpdate(BaseModel):
    task_ids: List[UUID]
    status: RemediationStatus


class RemediationTaskResponse(RemediationTaskBase):
    id: UUID
    tenant_id: UUID
    assessment_id: UUID
    outcome_id: str
    gap_id: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RemediationSummaryResponse(BaseModel):
    assessment_id: Optional[UUID] = None
    total_tasks: int
    open_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    total_budget_required_gbp: float
    total_estimated_effort_hours: float
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    sla_compliance_rate: float  # % on-time or completed on schedule
    overdue_tasks_count: int
