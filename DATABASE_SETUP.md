# 🗄️ HYPERFIT Database Initialization Guide

## ✅ Quick Database Setup

### **Method 1: Using the Initialization Script (Recommended)**

```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python init_database.py
```

This script will:
- ✅ Import all database models
- ✅ Create all tables (users, meals, workouts, exercises, ai_logs)
- ✅ Verify the database structure
- ✅ Show you the database location

### **Method 2: Direct Python Command**

```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python -c "from backend.core.database import create_tables; create_tables(); print('✅ Database initialized!')"
```

### **Method 3: Interactive Python Session**

```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python

# Then in Python:
>>> from backend.core.database import create_tables
>>> create_tables()
>>> print("✅ Database initialized!")
```

## 📊 Database Structure

After initialization, you'll have these tables:

1. **users** - User accounts and profiles
2. **meals** - Food tracking and nutrition data
3. **workouts** - Exercise sessions
4. **exercises** - Individual exercises within workouts
5. **ai_logs** - AI interaction tracking

## 🔄 Resetting the Database

If you need to start fresh:

```bash
# Delete the existing database
rm hyperfit.db

# Reinitialize
python init_database.py
```

## ✅ Verification

To verify your database is set up correctly:

```bash
# Check if database file exists
ls -lh hyperfit.db

# Check tables using SQLite
sqlite3 hyperfit.db ".tables"

# View database schema
sqlite3 hyperfit.db ".schema"
```

## 🚀 Next Steps

After initializing the database:

1. **Start the server**: `python start_server.py`
2. **Test the API**: Visit http://localhost:8000/docs
3. **Register a user**: Use the `/api/users/register` endpoint
4. **Start using HYPERFIT!**

## 📝 Notes

- The database file (`hyperfit.db`) is created in your project root
- All tables are created automatically on first initialization
- Relationships between tables are properly configured
- The database uses SQLite by default (can be changed to PostgreSQL in `.env`)

## 🐛 Troubleshooting

**If you get import errors:**
- Make sure virtual environment is activated: `source venv/bin/activate`
- Verify all dependencies are installed: `pip install -r requirements.txt`

**If tables don't appear:**
- Check database file permissions
- Verify models are imported correctly
- Run `python init_database.py` again

**If you see "table already exists" errors:**
- This is normal if the database already exists
- The `create_tables()` function won't overwrite existing tables
- Use Alembic migrations for schema changes (future enhancement)
