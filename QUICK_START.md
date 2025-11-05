# 🚀 HYPERFIT Quick Start Guide

## ✅ **Everything is Ready!**

Your HYPERFIT backend is fully configured and ready to use!

## 🎯 **Start the Server**

### **Option 1: Clean Start (Recommended)**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
./start_clean.sh
```
This clears caches and starts the server.

### **Option 2: Standard Start**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
python start_server.py
```

### **Option 3: Direct Uvicorn**
```bash
cd /Users/mr.heiser/PycharmProjects/HYPERFIT
source venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 🌐 **Access the API**

Once the server is running:

- **API Documentation (Swagger UI)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc
- **Root Endpoint**: http://localhost:8000/
- **Health Check**: http://localhost:8000/health

## 🧪 **Quick Test**

1. **Open the API docs**: http://localhost:8000/docs

2. **Register a user**:
   - Find `POST /api/users/register`
   - Click "Try it out"
   - Use this example:
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
   - Find `POST /api/users/login`
   - Use the same email/password
   - Copy the `access_token` from the response

4. **Test authenticated endpoint**:
   - Click the **"Authorize"** button at the top
   - Paste: `Bearer YOUR_TOKEN_HERE`
   - Try `GET /api/users/me`

## 📊 **Available Endpoints**

### **Users** (`/api/users`)
- `POST /register` - Create new user
- `POST /login` - Get JWT token
- `GET /me` - Get current user (auth required)
- `PUT /me` - Update profile (auth required)
- `DELETE /me` - Delete account (auth required)

### **Meals** (`/api/meals`)
- `POST /` - Create meal (auth required)
- `GET /` - List meals (auth required)
- `GET /{meal_id}` - Get meal details
- `PUT /{meal_id}` - Update meal
- `DELETE /{meal_id}` - Delete meal
- `POST /upload-image` - Upload meal image
- `POST /analyze` - AI meal analysis (coming soon)

### **Workouts** (`/api/workouts`)
- `POST /` - Create workout (auth required)
- `GET /` - List workouts (auth required)
- `GET /{workout_id}` - Get workout details
- `PUT /{workout_id}` - Update workout
- `DELETE /{workout_id}` - Delete workout
- `POST /upload-video` - Upload workout video
- `POST /analyze` - AI workout analysis (coming soon)
- `GET /{workout_id}/exercises` - Get exercises

## 🔧 **Configuration**

Your API key and settings are in `.env`:
- ✅ OpenAI API Key: Configured
- ✅ Model: `gpt-4o-mini`
- ✅ Database: SQLite (`hyperfit.db`)
- ✅ JWT: 30-minute expiration

## 🐛 **Troubleshooting**

**Server won't start?**
```bash
# Clear caches and restart
./start_clean.sh
```

**Import errors?**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Verify Python version
python --version  # Should be 3.11.x
```

**Port already in use?**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill

# Or change port in .env
PORT=8001
```

**Database issues?**
```bash
# Reinitialize database
python init_database.py
```

## 📝 **Next Steps**

1. ✅ **Backend is running** - You're here!
2. 🔄 **AI Integration** - Add OpenAI food recognition
3. 🔄 **MediaPipe** - Add workout tracking
4. 🔄 **Frontend** - Build React dashboard
5. 🔄 **Deployment** - Deploy to production

## 🎉 **You're All Set!**

Your HYPERFIT backend is running and ready to use. Start building amazing features! 🏋️
