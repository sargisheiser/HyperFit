"""Shared pytest fixtures for backend tests."""

import os
import sys
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Ensure the project root is importable without relying on PYTHONPATH hacks.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _reset_backend_modules() -> None:
    """Ensure backend modules are reloaded with fresh settings."""

    for module_name in [
        "backend.api",
        "backend.main",
        "backend.core.database",
        "backend.core.config",
        "backend.api.dependencies",
        "backend.api.auth_router",
        "backend.api.meal_router",
        "backend.api.workout_router",
        "backend.api.assistant_router",
        "backend.api.dashboard_router",
        "backend.api.nutrition",
        "backend.api.vision",
        "backend.models",
        "backend.models.user",
        "backend.models.workout",
        "backend.models.food",
        "backend.models.nutrition",
        "backend.models.dashboard",
    ]:
        if module_name in sys.modules:
            del sys.modules[module_name]


@pytest.fixture(scope="session")
def client(tmp_path_factory: pytest.TempPathFactory) -> Generator[TestClient, None, None]:
    """Provide a TestClient backed by an isolated SQLite database file."""

    db_dir = tmp_path_factory.mktemp("db")
    db_path = Path(db_dir) / "hyperfit_test.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    _reset_backend_modules()

    from backend.main import app  # import here to ensure reloaded settings are used
    from backend.core.config import settings
    from backend.core.database import create_tables, engine
    from sqlalchemy import inspect

    assert settings.database_url.endswith(str(db_path)), "DATABASE_URL env override not applied"
    assert str(engine.url).endswith(str(db_path)), "Engine still bound to previous database"
    create_tables()
    inspector = inspect(engine)
    assert "users" in inspector.get_table_names(), "users table missing after create_tables()"
    with TestClient(app) as test_client:
        yield test_client

    if db_path.exists():
        db_path.unlink()

