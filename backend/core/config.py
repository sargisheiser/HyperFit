"""
HYPERFIT Configuration Management
Centralized configuration using Pydantic settings.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union
import os
import json

class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = "HYPERFIT"
    app_version: str = "1.0.0"
    debug: bool = True
    secret_key: str = "your-secret-key-change-in-production"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "sqlite:///./hyperfit.db"
    
    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"  # Options: gpt-4o-mini, gpt-4.1-mini, gpt-5-mini
    
    # CORS - can be JSON array or comma-separated string
    cors_origins: Union[str, List[str]] = "http://localhost:3000,http://localhost:8000"
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: Union[str, List[str]] = "jpg,jpeg,png,webp"
    upload_dir: str = "uploads"
    
    # AI Processing
    ai_confidence_threshold: float = 0.7
    max_image_dimension: int = 1024
    
    # JWT Settings
    access_token_expire_minutes: int = 30
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON or comma-separated string."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                # Try parsing as JSON first
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                # If not JSON, split by comma
                return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    @field_validator('allowed_extensions', mode='before')
    @classmethod
    def parse_allowed_extensions(cls, v):
        """Parse allowed extensions from comma-separated string."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [ext.strip() for ext in v.split(',') if ext.strip()]
        return v
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        if isinstance(self.cors_origins, list):
            return self.cors_origins
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Get allowed extensions as a list."""
        if isinstance(self.allowed_extensions, list):
            return self.allowed_extensions
        return [ext.strip() for ext in self.allowed_extensions.split(',') if ext.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
