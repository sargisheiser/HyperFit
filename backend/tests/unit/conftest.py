"""Fixtures and markers for backend unit tests.

Unit tests run against pure Python / isolated in-memory state — no FastAPI
TestClient, no real SQLite file, no network. Every test collected under
backend/tests/unit/ is auto-marked `unit` via pytest_collection_modifyitems.
"""

from collections.abc import Generator
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def pytest_collection_modifyitems(config, items):
    """Mark every test collected under this directory as `unit`."""
    unit_marker = pytest.mark.unit
    for item in items:
        if "/backend/tests/unit/" in str(item.fspath):
            item.add_marker(unit_marker)


@pytest.fixture
def mock_db() -> MagicMock:
    """Return a MagicMock Session for call-tracking unit tests.

    Use when the code under test only needs to call `db.add`, `db.commit`,
    `db.query(...).filter(...).first()`, etc. and the assertion is on the
    call signature — not on round-tripping real data.
    """
    session = MagicMock(spec=Session)
    # Chain common query builder methods so `db.query(Model).filter(...).first()`
    # doesn't raise AttributeError in tests that don't care about the result.
    query = session.query.return_value
    query.filter.return_value = query
    query.filter_by.return_value = query
    query.order_by.return_value = query
    query.limit.return_value = query
    query.offset.return_value = query
    query.first.return_value = None
    query.all.return_value = []
    query.count.return_value = 0
    return session


@pytest.fixture
def in_memory_db() -> Generator[Session, None, None]:
    """Provide a real SQLAlchemy session on an isolated in-memory SQLite DB.

    Use when the code under test exercises real ORM behavior (relationships,
    constraints, default values) but should not touch the shared
    test_hyperfit.db file or other tests' state. Each test gets a fresh DB.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create all tables defined on the shared Base metadata.
    from backend.core.database import Base

    Base.metadata.create_all(bind=engine)

    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
