"""Open CAF Core Configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "Open CAF"

    # PostgreSQL Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "caf_admin"
    POSTGRES_PASSWORD: str = "caf_secure_password_change_in_prod"
    POSTGRES_DB: str = "open_caf_db"
    DATABASE_URL: Optional[str] = None
    DATABASE_SYNC_URL: Optional[str] = None

    # Application Security
    SECRET_KEY: str = "change_this_to_a_super_secret_key_at_least_32_chars_long_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    STORAGE_TYPE: str = "local"
    STORAGE_DIR: str = "/app/storage_data"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    def get_sync_database_url(self) -> str:
        if self.DATABASE_SYNC_URL:
            return self.DATABASE_SYNC_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
