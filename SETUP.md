# 🏋️ HYPERFIT Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env with your API keys
nano .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SECRET_KEY`: Random secret key for JWT tokens
- `DATABASE_URL`: Database connection string

### 3. Initialize Database
```bash
# Run the setup script
python test_setup.py

# Or manually initialize
python -c "from backend.core.database import create_tables; create_tables()"
```

### 4. Start the Server
```bash
# Option 1: Using the startup script
python start_server.py

# Option 2: Direct uvicorn
uvicorn backend.main:app --reload

# Option 3: Using the setup script
./deployment/scripts/setup.sh
```

## 📡 API Endpoints

Once running, visit:
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Root**: http://localhost:8000/

### Available Endpoints:

#### Users (`/api/users`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `PUT /me` - Update current user
- `DELETE /me` - Delete current user

#### Meals (`/api/meals`)
- `POST /` - Create meal
- `GET /` - List user meals
- `GET /{meal_id}` - Get specific meal
- `PUT /{meal_id}` - Update meal
- `DELETE /{meal_id}` - Delete meal
- `POST /upload-image` - Upload meal image
- `POST /analyze` - Analyze meal with AI

#### Workouts (`/api/workouts`)
- `POST /` - Create workout
- `GET /` - List user workouts
- `GET /{workout_id}` - Get specific workout
- `PUT /{workout_id}` - Update workout
- `DELETE /{workout_id}` - Delete workout
- `POST /upload-video` - Upload workout video
- `POST /analyze` - Analyze workout with AI
- `GET /{workout_id}/exercises` - Get workout exercises

## 🧪 Testing the API

### 1. Register a User
```bash
curl -X POST "http://localhost:8000/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpassword123",
    "full_name": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Use the Token
```bash
# Replace YOUR_TOKEN with the access_token from login
curl -X GET "http://localhost:8000/api/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐳 Docker Setup

### Build and Run with Docker
```bash
# Build the image
docker build -f deployment/docker/Dockerfile -t hyperfit .

# Run the container
docker run -p 8000:8000 hyperfit

# Or use docker-compose
cd deployment/docker
docker-compose up
```

## 🔧 Development

### Project Structure
```
HYPERFIT/
├── backend/           # FastAPI backend
│   ├── api/          # API routes
│   ├── core/         # Configuration & auth
│   └── models/       # Pydantic schemas
├── database/         # Database models
├── ai_modules/      # AI processing
├── utils/           # Shared utilities
└── deployment/      # Docker & scripts
```

### Key Features Implemented:
- ✅ JWT Authentication
- ✅ User Management (CRUD)
- ✅ Meal Tracking (CRUD)
- ✅ Workout Tracking (CRUD)
- ✅ File Upload Support
- ✅ Database Models
- ✅ API Documentation
- ✅ Docker Support

### Next Steps:
- 🔄 OpenAI Integration (Food Recognition)
- 🔄 MediaPipe Integration (Workout Analysis)
- 🔄 LLM Chat Assistant
- 🔄 Frontend Dashboard

## 🐛 Troubleshooting

### Common Issues:

1. **Import Errors**: Make sure you're in the project root directory
2. **Database Errors**: Check that SQLite file permissions are correct
3. **Port Already in Use**: Change the port in `.env` or kill existing processes
4. **Missing Dependencies**: Run `pip install -r requirements.txt`

### Logs and Debugging:
- Check the console output for error messages
- Use `DEBUG=True` in `.env` for detailed logs
- API documentation at `/docs` shows all available endpoints

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json
