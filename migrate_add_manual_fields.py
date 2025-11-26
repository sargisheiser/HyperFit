#!/usr/bin/env python3
"""
Migration script to add manual meal entry and correction fields to food_logs table.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from backend.core.database import engine, session_scope


def migrate():
    """Add new columns to food_logs table if they don't exist."""
    try:
        print("🔧 Migrating food_logs table...")
        print("=" * 50)

        with session_scope() as session:
            # Check if columns exist using a simple query
            try:
                result = session.execute(text("PRAGMA table_info(food_logs)"))
                existing_columns = [row[1] for row in result.fetchall()]
            except Exception:
                # Fallback: try to query the table structure
                existing_columns = []
                try:
                    result = session.execute(text("SELECT * FROM food_logs LIMIT 1"))
                    existing_columns = [desc[0] for desc in result.cursor.description] if result.cursor else []
                except Exception:
                    existing_columns = []

            migrations = []

            # Add is_manual column
            if "is_manual" not in existing_columns:
                try:
                    session.execute(
                        text("ALTER TABLE food_logs ADD COLUMN is_manual INTEGER DEFAULT 0 NOT NULL")
                    )
                    migrations.append("✅ Added is_manual column")
                except Exception as e:
                    migrations.append(f"⚠️  Could not add is_manual: {e}")
            else:
                migrations.append("ℹ️  is_manual column already exists")

            # Add is_corrected column
            if "is_corrected" not in existing_columns:
                try:
                    session.execute(
                        text("ALTER TABLE food_logs ADD COLUMN is_corrected INTEGER DEFAULT 0 NOT NULL")
                    )
                    migrations.append("✅ Added is_corrected column")
                except Exception as e:
                    migrations.append(f"⚠️  Could not add is_corrected: {e}")
            else:
                migrations.append("ℹ️  is_corrected column already exists")

            # Add note column
            if "note" not in existing_columns:
                try:
                    session.execute(text("ALTER TABLE food_logs ADD COLUMN note VARCHAR(500)"))
                    migrations.append("✅ Added note column")
                except Exception as e:
                    migrations.append(f"⚠️  Could not add note: {e}")
            else:
                migrations.append("ℹ️  note column already exists")

            session.commit()

            print("\n📋 Migration results:")
            for migration in migrations:
                print(f"   {migration}")

            print("\n✅ Migration complete!")
            return True

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)

