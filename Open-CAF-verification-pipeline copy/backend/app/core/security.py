"""Cryptographic security utilities: password hashing & JWT tokens."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import get_settings

settings = get_settings()

def get_password_hash(password: str) -> str:
    """Hashes a plain password using bcrypt (max 72 bytes)."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(
    subject: Union[str, Any],
    tenant_id: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a signed JWT access token encoding user identity, tenant, and role."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "tenant_id": str(tenant_id),
        "role": str(role),
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(
    subject: Union[str, Any],
    tenant_id: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a long-lived signed JWT refresh token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "tenant_id": str(tenant_id),
        "role": str(role),
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token; raises HTTP 401 on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
