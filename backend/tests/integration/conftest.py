"""Marker for backend integration tests.

Every test module under backend/tests/integration/ inherits the
`integration` marker via `pytestmark` below. The shared fixtures
(`client`, `db_session`, `test_app`) come from backend/tests/conftest.py.
"""

import pytest


def pytest_collection_modifyitems(config, items):
    """Mark every test collected under this directory as `integration`."""
    integration_marker = pytest.mark.integration
    for item in items:
        if "/backend/tests/integration/" in str(item.fspath):
            item.add_marker(integration_marker)
