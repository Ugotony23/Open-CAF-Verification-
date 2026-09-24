"""Authentication and Authorization Pydantic Schemas."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.tenant import AuthorityType
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    type: str
    exp: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class InitialAdminRegisterRequest(BaseModel):
    council_name: str = Field(..., min_length=2, max_length=255, description="e.g. Borsetshire District Council")
    authority_type: AuthorityType = Field(default=AuthorityType.DISTRICT)
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Strong password minimum 8 chars")

class CouncilTenantResponse(BaseModel):
    id: UUID
    name: str
    authority_type: AuthorityType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    tenant_id: UUID
    tenant_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
