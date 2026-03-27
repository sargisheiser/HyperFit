"""Shared pytest fixtures for backend tests."""

import os
import sys
from collections.abc import Generator
from pathlib import Path

# Set testing mode BEFORE any imports to disable rate limiting
os.environ["TESTING"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure the project root is importable without relying on PYTHONPATH hacks.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Set test database URL before any imports
TEST_DB_PATH = Path(__file__).parent / "test_hyperfit.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="session")
def test_app():
    """Create the FastAPI app once per test session."""
    from backend.core.database import create_tables
    from backend.main import app

    # Create all tables
    create_tables()

    yield app

    # Cleanup after all tests
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(scope="function")
def client(test_app) -> Generator[TestClient, None, None]:
    """Provide a TestClient with database cleanup between tests."""
    from backend.core.database import engine

    # Clean all data before each test
    with engine.connect() as conn:
        # Delete all data from tables (order matters for foreign keys)
        tables = [
            "payment_events",
            "subscriptions",
            "nutrition_checkins",
            "weight_logs",
            "meals",
            "daily_nutrition",
            "exercises",
            "workouts",
            "food_logs",
            "activities",
            "users",
        ]
        for table in tables:
            try:
                conn.execute(text(f"DELETE FROM {table}"))
            except Exception:
                pass  # Table might not exist
        conn.commit()

    with TestClient(test_app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def db_session():
    """Provide a database session for direct database access in tests."""
    from backend.core.database import SessionLocal, create_tables

    # Ensure all model tables exist
    create_tables()

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
