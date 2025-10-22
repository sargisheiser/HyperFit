"""
HYPERFIT Configuration Management
Centralized configuration using Pydantic settings.
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os

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
    openai_model: str = "gpt-4-vision-preview"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "webp"]
    upload_dir: str = "uploads"
    
    # AI Processing
    ai_confidence_threshold: float = 0.7
    max_image_dimension: int = 1024
    
    # JWT Settings
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
