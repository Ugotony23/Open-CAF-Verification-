"""Authentication and Authorization REST Endpoints."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, UserRole
from app.models.tenant import CouncilTenant
from app.schemas.auth import (
    Token,
    RefreshTokenRequest,
    UserLoginRequest,
    InitialAdminRegisterRequest,
    UserResponse,
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth2 compatible token login. Accepts username (email) and password.
    Returns signed access and refresh tokens.
    """
    email = form_data.username.lower().strip()
    result = await db.execute(select(User).filter_by(email=email))
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    payload_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Validates refresh token and issues a new access/refresh token pair."""
    payload = decode_token(payload_data.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: refresh token expected",
        )

    user_id_str = payload.get("sub")
    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token user identifier",
        )

    result = await db.execute(select(User).filter_by(id=user_uuid))
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active or valid",
        )

    new_access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    new_refresh_token = create_refresh_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns profile and council tenant details for the authenticated user."""
    result = await db.execute(select(CouncilTenant).filter_by(id=current_user.tenant_id))
    tenant = result.scalars().first()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        tenant_name=tenant.name if tenant else None,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )

@router.post("/register-initial-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_initial_admin(
    payload: InitialAdminRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Bootstrap endpoint: Registers the first Council Tenant and initial CISO Administrator.
    This endpoint is permanently locked once any council tenant exists.
    """
    result = await db.execute(select(CouncilTenant))
    existing_tenant = result.scalars().first()

    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Initial admin registration is disabled: council tenant already configured.",
        )

    # 1. Create first Council Tenant
    tenant = CouncilTenant(
        name=payload.council_name.strip(),
        authority_type=payload.authority_type,
    )
    db.add(tenant)
    await db.flush()

    # 2. Create initial CISO administrator
    hashed_pwd = get_password_hash(payload.password)
    admin_user = User(
        tenant_id=tenant.id,
        email=payload.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=payload.full_name.strip(),
        role=UserRole.CISO_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)

    return UserResponse(
        id=admin_user.id,
        email=admin_user.email,
        full_name=admin_user.full_name,
        role=admin_user.role,
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        is_active=admin_user.is_active,
        created_at=admin_user.created_at,
    )
