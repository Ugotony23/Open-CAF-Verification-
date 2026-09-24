"""Pydantic Schemas for AI Copilot Assistant & Human-in-the-Loop Suggestions."""
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.ai_suggestion import SuggestionType, SuggestionStatus


class SuggestMappingRequest(BaseModel):
    assessment_id: Optional[UUID] = None


class GapCritiqueRequest(BaseModel):
    assessment_id: UUID
    outcome_id: str = Field(..., min_length=2, max_length=10)
    evidence_ids: Optional[List[UUID]] = None


class DraftRemediationRequest(BaseModel):
    assessment_id: UUID
    gap_id: str
    outcome_id: Optional[str] = None


class RejectSuggestionRequest(BaseModel):
    rejection_reason: Optional[str] = Field(None, max_length=1000)


class AISuggestionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    assessment_id: Optional[UUID] = None
    evidence_id: Optional[UUID] = None
    outcome_id: Optional[str] = None
    gap_id: Optional[str] = None
    suggestion_type: SuggestionType
    status: SuggestionStatus
    title: str
    summary: str
    payload: Dict[str, Any]
    citation_quotes: List[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvidenceMappingItem(BaseModel):
    outcome_id: str
    outcome_title: str
    citation_quote: str
    rationale: str
    confidence_score: float
