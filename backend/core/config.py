"""
HYPERFIT Configuration Management
Centralized configuration using Pydantic settings.
"""

import json
import os
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # Application metadata
    app_name: str = "HYPERFIT"
    app_version: str = "1.0.0"
    debug: bool = True
    secret_key: str = "change-me-in-production"  # Should be set via SECRET_KEY environment variable
    
    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate that secret key is changed from default in production."""
        if v == "change-me-in-production":
            import os
            # Only warn in development, but don't fail
            if os.getenv("DEBUG", "True").lower() == "true":
                import warnings
                warnings.warn(
                    "⚠️  SECRET_KEY is set to default value 'change-me-in-production'. "
                    "Change this in production! Set SECRET_KEY environment variable.",
                    UserWarning
                )
            else:
                # In production, this should fail
                raise ValueError(
                    "SECRET_KEY must be set to a secure random value in production. "
                    "Set SECRET_KEY environment variable."
                )
        # Ensure minimum length
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "sqlite:///./hyperfit.db"

    # AI configuration
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    vision_timeout_seconds: int = 25
    vision_mock_mode: bool = False
    vision_log_level: Optional[str] = None

    # CORS
    cors_origins: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    # File uploads
    max_file_size: int = 10 * 1024 * 1024
    allowed_extensions: Union[str, List[str]] = "jpg,jpeg,png,webp"
    upload_dir: str = "uploads"

    # AI processing defaults
    ai_confidence_threshold: float = 0.7
    max_image_dimension: int = 1024

    # Security
    access_token_expire_minutes: int = 60

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return []

    @field_validator("allowed_extensions", mode="before")
    @classmethod
    def parse_allowed_extensions(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [ext.strip() for ext in value.split(",") if ext.strip()]
        return []

    @property
    def cors_origins_list(self) -> List[str]:
        return list(self.cors_origins)

    @property
    def allowed_extensions_list(self) -> List[str]:
        return list(self.allowed_extensions)


settings = Settings()
os.makedirs(settings.upload_dir, exist_ok=True)
