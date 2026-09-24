"""Pydantic schemas for Council Service Criticality Catalog."""
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.models.council_service import ServiceTier, TIER_WEIGHTS


class CouncilServiceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Council service name")
    description: Optional[str] = Field(None, description="Detailed operational and statutory description")
    tier: ServiceTier = Field(..., description="Service criticality tier (TIER_1, TIER_2, TIER_3)")
    weight_multiplier: Optional[float] = Field(
        None,
        ge=0.5,
        le=5.0,
        description="Risk weight multiplier (3.0 for Tier 1, 2.0 for Tier 2, 1.0 for Tier 3)",
    )
    is_active: bool = Field(True, description="Whether the service is actively provided by the council")


class CouncilServiceCreate(CouncilServiceBase):
    @model_validator(mode="after")
    def set_default_weight(self) -> "CouncilServiceCreate":
        if self.weight_multiplier is None:
            self.weight_multiplier = TIER_WEIGHTS.get(self.tier, 1.0)
        return self


class CouncilServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    tier: Optional[ServiceTier] = None
    weight_multiplier: Optional[float] = Field(None, ge=0.5, le=5.0)
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def adjust_weight_if_tier_changed(self) -> "CouncilServiceUpdate":
        if self.tier is not None and self.weight_multiplier is None:
            self.weight_multiplier = TIER_WEIGHTS.get(self.tier, 1.0)
        return self


class CouncilServiceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str] = None
    tier: ServiceTier
    weight_multiplier: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouncilServiceListResponse(BaseModel):
    services: list[CouncilServiceResponse]
    total: int
    tier_counts: Dict[str, int]
