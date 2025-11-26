#!/usr/bin/env python3
"""
HYPERFIT Setup Test Script
Test the basic setup and database initialization.
"""

import os
import sys
import traceback

from sqlalchemy import inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.core.database import create_tables, engine


def test_database_connection():
    """Ensure database tables can be created and required schemas exist."""

    print("🔧 Testing database connection...")
    create_tables()

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    expected_tables = {"users", "workouts", "exercises", "food_logs"}

    missing_tables = expected_tables - tables
    assert not missing_tables, f"Missing tables after create_tables(): {missing_tables}"

    print("✅ Database tables verified!")


def test_imports():
    """Import current routers and models to ensure module wiring is valid."""

    print("📦 Testing imports...")
    from backend.main import app  # noqa: F401
    from backend.api import api_router
    from backend.api.assistant_router import router as assistant_router
    from backend.api.auth_router import router as auth_router
    from backend.api.dashboard_router import router as dashboard_router
    from backend.api.meal_router import router as meal_router
    from backend.api.workout_router import router as workout_router, ws_router as workout_ws_router
    from backend.api.nutrition import router as nutrition_router
    from backend.models import food as food_models
    from backend.models import user as user_models
    from backend.models import workout as workout_models

    assert api_router.routes, "api_router is empty"
    assert hasattr(auth_router, "routes"), "auth_router missing routes attribute"
    assert hasattr(workout_router, "routes"), "workout_router missing routes attribute"
    assert hasattr(workout_ws_router, "routes"), "workout_ws_router missing routes attribute"
    assert hasattr(meal_router, "routes"), "meal_router missing routes attribute"
    assert hasattr(assistant_router, "routes"), "assistant_router missing routes attribute"
    assert hasattr(dashboard_router, "routes"), "dashboard_router missing routes attribute"
    assert hasattr(nutrition_router, "routes"), "nutrition_router missing routes attribute"
    assert hasattr(user_models, "User"), "User model missing"
    assert hasattr(food_models, "FoodLog"), "FoodLog model missing"
    assert hasattr(workout_models, "Workout"), "Workout model missing"

    print("✅ All imports successful!")

def main():
    """Run all tests."""
    print("🏋️ HYPERFIT Setup Test")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_database_connection
    ]
    
    passed = 0
    failures = []
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as exc:  # pragma: no cover - manual smoke execution
            failures.append((test.__name__, exc))
            print(f"❌ {test.__name__} failed: {exc}")
            traceback.print_exc()
        finally:
            print()
    
    print(f"📊 Results: {passed}/{len(tests)} tests passed")
    
    if not failures:
        print("🎉 All tests passed! HYPERFIT is ready to run.")
        print("🚀 Start the server with: uvicorn backend.main:app --reload")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
