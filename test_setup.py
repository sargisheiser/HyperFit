#!/usr/bin/env python3
"""
HYPERFIT Setup Test Script
Test the basic setup and database initialization.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.core.database import create_tables, engine
from backend.core.config import settings

def test_database_connection():
    """Test database connection and table creation."""
    try:
        print("🔧 Testing database connection...")
        create_tables()
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_imports():
    """Test that all modules can be imported."""
    try:
        print("📦 Testing imports...")
        from backend.main import app
        from backend.api import users, meals, workouts
        from database.models import user, meal, workout, ai_log
        print("✅ All imports successful!")
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def main():
    """Run all tests."""
    print("🏋️ HYPERFIT Setup Test")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_database_connection
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
        print()
    
    print(f"📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! HYPERFIT is ready to run.")
        print("🚀 Start the server with: uvicorn backend.main:app --reload")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
