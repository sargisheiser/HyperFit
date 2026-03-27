
#!/usr/bin/env python3
"""
HYPERFIT Database Initialization Script
Creates all database tables and verifies the setup.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def init_database():
    """Initialize the database by creating all tables."""
    try:
        print("🔧 Initializing HYPERFIT Database...")
        print("=" * 50)
        
        # Import all models first (this ensures relationships are registered)
        print("📦 Importing database models...")
        from backend.models.user import User
        from backend.models.nutrition import Meal, DailyNutrition, WeightLog, NutritionCheckIn
        from backend.models.workout import Workout, Exercise
        from backend.models.food import FoodLog
        from backend.models.activity import Activity
        print("✅ All models imported successfully")
        
        # Import database utilities
        print("\n🗄️  Creating database tables...")
        from backend.core.database import create_tables, engine
        
        # Create all tables
        create_tables()
        print("✅ Database tables created successfully!")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"\n📊 Database contains {len(tables)} tables:")
        for table in sorted(tables):
            print(f"   - {table}")
        
        # Check expected tables
        expected_tables = [
            "users", "meals", "workouts", "exercises", "food_logs",
            "daily_nutrition", "weight_logs", "nutrition_checkins", "activities",
        ]
        missing = [t for t in expected_tables if t not in tables]
        
        if missing:
            print(f"\n⚠️  Warning: Missing tables: {', '.join(missing)}")
        else:
            print("\n🎉 All expected tables are present!")
        
        print("\n✅ Database initialization complete!")
        print(f"📁 Database location: {os.path.abspath('hyperfit.db')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
