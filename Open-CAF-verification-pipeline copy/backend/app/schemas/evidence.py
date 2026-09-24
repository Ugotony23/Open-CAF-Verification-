"""Pydantic schemas for Evidence Artifacts, Links, and Freshness Coverage."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime, date
from app.models.evidence import EvidenceCategory

class EvidenceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    description: Optional[str] = None
    category: EvidenceCategory
    file_name: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    external_url: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    uploaded_by_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    is_stale: bool = False
    is_expiring_soon: bool = False
    linked_outcome_ids: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class EvidenceListResponse(BaseModel):
    items: List[EvidenceResponse]
    total: int
    page: int
    page_size: int

class EvidenceLinkCreate(BaseModel):
    outcome_id: str = Field(..., description="Contributing outcome code (e.g. 'A1.a', 'B2.a')")
    igp_id: Optional[UUID] = Field(None, description="Optional specific IGP UUID satisfied by this evidence")
    citation_notes: Optional[str] = Field(None, description="Specific page, section, or audit excerpt")

class EvidenceLinkResponse(BaseModel):
    id: UUID
    evidence_id: UUID
    outcome_id: str
    igp_id: Optional[UUID] = None
    citation_notes: Optional[str] = None
    linked_by_user_id: Optional[UUID] = None
    linked_at: datetime
    evidence_title: Optional[str] = None
    file_name: Optional[str] = None
    is_stale: bool = False
    is_expiring_soon: bool = False

    model_config = ConfigDict(from_attributes=True)

class PrincipleCoverage(BaseModel):
    principle_id: str
    total_outcomes: int
    evidenced_outcomes: int
    coverage_rate: float

class ObjectiveCoverage(BaseModel):
    objective_id: str
    total_outcomes: int
    evidenced_outcomes: int
    coverage_rate: float

class EvidenceCoverageResponse(BaseModel):
    assessment_id: UUID
    total_outcomes: int = 39
    evidenced_outcomes: int
    stale_evidenced_outcomes: int
    unevidenced_outcomes: int
    coverage_rate: float
    principles: Dict[str, PrincipleCoverage] = {}
    objectives: Dict[str, ObjectiveCoverage] = {}
