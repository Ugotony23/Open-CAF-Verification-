"""Open CAF Database Session & Engine Configuration."""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from typing import AsyncGenerator
from app.core.config import get_settings

settings = get_settings()

# Declarative Base for all models
class Base(DeclarativeBase):
    pass

# Async Engine for FastAPI async requests
async_engine = create_async_engine(
    settings.get_database_url(),
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync Engine for Alembic migrations and CLI utilities
sync_engine = create_engine(
    settings.get_sync_database_url(),
    echo=False,
    future=True,
    pool_pre_ping=True,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)

# FastAPI Dependency for database sessions
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
