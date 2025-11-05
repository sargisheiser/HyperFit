# 🚀 HYPERFIT Quick Start Guide

## Step-by-Step Setup

### Step 1: Create Virtual Environment (Using Python 3.11)
```bash
# Remove existing venv if it exists
rm -rf venv

# Create new virtual environment with Python 3.11
python3.11 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
# Upgrade pip first
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt
```

### Step 3: Set Up Environment Variables
```bash
# Copy the example file
cp env.example .env

# Generate a secret key (run this command)
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Edit .env file and add:
# - Your OpenAI API key (if you have one)
# - The SECRET_KEY from above
# - Keep other defaults for now
```

### Step 4: Initialize Database
```bash
# Create database tables
python -c "from backend.core.database import create_tables; create_tables()"
```

### Step 5: Start the Server
```bash
# Option 1: Use the startup script
python start_server.py

# Option 2: Direct uvicorn command
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 6: Access the API
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Root**: http://localhost:8000/

## 🧪 Quick Test

Once the server is running, test it:

1. **Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Register a User** (using the Swagger UI at /docs):
   - Go to http://localhost:8000/docs
   - Find POST `/api/users/register`
   - Click "Try it out"
   - Enter test data:
     ```json
     {
       "email": "test@example.com",
       "username": "testuser",
       "password": "testpass123",
       "full_name": "Test User"
     }
     ```
   - Click "Execute"

3. **Login**:
   - Use POST `/api/users/login` with the same email/password
   - Copy the `access_token` from the response

4. **Test Authenticated Endpoint**:
   - Click "Authorize" button at top of Swagger UI
   - Paste the token: `Bearer YOUR_TOKEN_HERE`
   - Try GET `/api/users/me`

## ✅ Success Indicators

You'll know it's working when:
- ✅ Server starts without errors
- ✅ You can access http://localhost:8000/docs
- ✅ Health check returns `{"status": "healthy"}`
- ✅ You can register a user successfully
- ✅ You can login and get a token

## 🐛 Troubleshooting

**If you get import errors:**
- Make sure virtual environment is activated (`source venv/bin/activate`)
- Make sure you're in the project root directory

**If port 8000 is in use:**
- Change port in `.env` file: `PORT=8001`
- Or kill the process: `lsof -ti:8000 | xargs kill`

**If database errors:**
- Make sure you ran Step 4 (database initialization)
- Check file permissions on `hyperfit.db`

**If authentication errors:**
- Make sure you set `SECRET_KEY` in `.env`
- Regenerate if needed using the command in Step 3
