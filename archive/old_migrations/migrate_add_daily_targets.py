#!/usr/bin/env python3
"""
Migration script to add daily_calorie_target and daily_protein_target columns to users table.
"""

import sys
from sqlalchemy import text, inspect
from backend.core.database import engine, SessionLocal

def migrate_add_daily_targets():
    """Add daily_calorie_target and daily_protein_target columns if they don't exist."""
    
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    with SessionLocal() as session:
        try:
            # Add daily_calorie_target if it doesn't exist
            if 'daily_calorie_target' not in columns:
                print("Adding daily_calorie_target column...")
                session.execute(text("ALTER TABLE users ADD COLUMN daily_calorie_target INTEGER"))
                session.commit()
                print("✅ Added daily_calorie_target column")
            else:
                print("✓ daily_calorie_target column already exists")
            
            # Add daily_protein_target if it doesn't exist
            if 'daily_protein_target' not in columns:
                print("Adding daily_protein_target column...")
                session.execute(text("ALTER TABLE users ADD COLUMN daily_protein_target INTEGER"))
                session.commit()
                print("✅ Added daily_protein_target column")
            else:
                print("✓ daily_protein_target column already exists")
                
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            session.rollback()
            print(f"❌ Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    migrate_add_daily_targets()

