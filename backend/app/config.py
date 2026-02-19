from __future__ import annotations
"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "Interactive Learning Platform"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/learning_platform"
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Object Storage (MinIO/S3)
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_uploads: str = "uploads"
    s3_bucket_artifacts: str = "artifacts"
    s3_region: str = "us-east-1"

    # Firebase
    firebase_project_id: str = ""
    firebase_credentials_path: str = ""

    # LLM Providers
    google_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    default_llm_provider: str = "gemini"  # gemini | openai | anthropic

    # Tavily (Deep Research)
    tavily_api_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    stripe_price_team: str = ""

    # Rate Limiting
    rate_limit_free_messages: int = 50
    rate_limit_free_uploads_mb: int = 100
    rate_limit_pro_uploads_mb: int = 5120

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
