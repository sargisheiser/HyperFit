"""
HYPERFIT Database Configuration
SQLAlchemy database setup with session management.
"""

from collections.abc import Iterator
from contextlib import contextmanager

from backend.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)
Base = declarative_base()


def get_db() -> Iterator[sessionmaker]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope():
    """Provide a transactional scope around a series of operations."""

    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables() -> None:
    """Import models and ensure database tables exist."""

    # Lazy imports ensure SQLAlchemy model metadata is registered
    from backend.models import activity, food, nutrition, subscription, user, workout  # noqa: F401

    Base.metadata.create_all(bind=engine)
