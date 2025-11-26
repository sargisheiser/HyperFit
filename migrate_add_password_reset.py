#!/usr/bin/env python3
"""
Migration script to add password reset fields to users table.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from backend.core.database import engine, session_scope


def migrate():
    """Add password reset columns to users table if they don't exist."""
    try:
        print("🔧 Migrating users table for password reset...")
        print("=" * 50)

        with session_scope() as session:
            # Check if columns exist and add them if they don't
            from sqlalchemy import inspect as sqlalchemy_inspect
            inspector = sqlalchemy_inspect(session.bind)
            existing_columns = [col["name"] for col in inspector.get_columns("users")]

            migrations = []

            # Add reset_token column
            if "reset_token" not in existing_columns:
                session.execute(
                    text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)")
                )
                migrations.append("✅ Added reset_token column")
            else:
                migrations.append("ℹ️  reset_token column already exists")

            # Add reset_token_expires column
            if "reset_token_expires" not in existing_columns:
                session.execute(
                    text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME")
                )
                migrations.append("✅ Added reset_token_expires column")
            else:
                migrations.append("ℹ️  reset_token_expires column already exists")

            # Create index on reset_token for faster lookups
            try:
                session.execute(
                    text("CREATE INDEX IF NOT EXISTS ix_users_reset_token ON users(reset_token)")
                )
                migrations.append("✅ Created index on reset_token")
            except Exception as e:
                migrations.append(f"ℹ️  Index creation skipped: {e}")

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

