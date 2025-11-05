"""
HYPERFIT Database Configuration
SQLAlchemy database setup with session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables."""
    # Import all models to ensure they're registered with Base
    # This ensures relationships are properly registered before table creation
    try:
        # Import from models package which handles import order
        from database.models import User, Meal, Workout, Exercise, AILog
    except ImportError as e:
        # Fallback: import individually if package import fails
        try:
            from database.models.meal import Meal
            from database.models.workout import Workout, Exercise
            from database.models.ai_log import AILog
            from database.models.user import User
        except ImportError:
            pass
    
    Base.metadata.create_all(bind=engine)
