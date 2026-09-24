"""FastAPI Dependency Injectors for Security, Auth, and Council Tenancy."""
import uuid
from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.tenant import CouncilTenant

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=True,
)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validates Bearer access token and returns authenticated active User."""
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a valid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).filter_by(id=user_uuid))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Guarantees the authenticated user is currently active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user

def require_role(allowed_roles: List[UserRole]) -> Callable:
    """
    Role-Based Access Control dependency factory.
    Enforces that current user possesses at least one of the specified roles.
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: Role '{current_user.role.value}' is not authorized to access this resource",
            )
        return current_user
    return role_checker

async def get_current_tenant(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> CouncilTenant:
    """Extracts and verifies the current user's council tenant organization."""
    result = await db.execute(select(CouncilTenant).filter_by(id=current_user.tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Council tenant organization not found",
        )
    return tenant
