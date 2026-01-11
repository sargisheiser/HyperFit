<div align="center">

# 🏋️ HYPERFIT

### AI-Powered Fitness & Nutrition Platform

*Transform your fitness journey with cutting-edge AI technology*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg)](https://reactjs.org/)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture)

---

</div>

## 🌟 Overview

**HYPERFIT** is a modern, AI-powered fitness and nutrition platform that helps users achieve their health goals through intelligent meal analysis, personalized workout tracking, and an AI-powered fitness assistant.

### 🎯 Key Highlights

- 🤖 **AI-Powered Meal Recognition** - Instantly analyze your meals using advanced computer vision
- 💬 **Intelligent Chat Assistant** - Get personalized fitness advice powered by LangChain
- 📊 **Real-time Workout Tracking** - Track exercises using MediaPipe pose estimation
- 📈 **Comprehensive Nutrition Dashboard** - Monitor calories, macros, and progress
- 🎨 **Modern UI/UX** - Beautiful, responsive interface built with React and Tailwind CSS

---

## ✨ Features

### 🍽️ AI Meal Recognition
- **Computer Vision Analysis** - Upload meal photos for instant nutritional breakdown
- **Multiple AI Providers** - OpenAI GPT-4 Vision and Google Gemini support
- **Detailed Macros** - Automatic calculation of calories, protein, carbs, and fats
- **Food Item Detection** - Identify individual food items with confidence scores
- **Personalized Recommendations** - AI-powered meal suggestions based on your goals

### 💪 Workout Tracking
- **Live Pose Estimation** - Real-time exercise tracking using MediaPipe
- **Exercise Recognition** - Automatically detect and count repetitions
- **Workout History** - Track your progress over time
- **Custom Workouts** - Create and save your own workout routines

### 🤖 AI Fitness Assistant
- **Personalized Coaching** - Get tailored fitness advice based on your profile
- **Nutrition Guidance** - Ask questions about meal planning and macros
- **Goal Tracking** - Receive insights on your progress and recommendations
- **Context-Aware Responses** - Assistant understands your fitness goals and history

### 📊 Nutrition Dashboard
- **Daily Calorie Tracking** - Monitor your intake vs. goals
- **Macro Breakdown** - Detailed protein, carbs, and fat tracking
- **Progress Visualization** - Charts and graphs showing your journey
- **Goal Management** - Set and adjust calorie and macro targets

### 🔒 Security & Performance
- **JWT Authentication** - Secure user authentication and authorization
- **Rate Limiting** - API protection against abuse
- **Input Validation** - Comprehensive security measures
- **File Upload Security** - Safe image upload handling
- **CORS Protection** - Secure cross-origin resource sharing

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **PostgreSQL** (optional, SQLite works out of the box)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/HYPERFIT.git
   cd HYPERFIT
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy environment file
   cp env.example .env
   
   # Edit .env and add your API keys
   # - OPENAI_API_KEY (for chat assistant)
   # - GEMINI_API_KEY (for meal recognition)
   # - SECRET_KEY (generate: python -c "import secrets; print(secrets.token_urlsafe(32))")
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Initialize database
   python init_database.py
   ```

5. **Start the Application**
   ```bash
   # Terminal 1: Backend
   python start_server.py
   # Server runs on http://localhost:8000
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

---

## 📖 Usage

### Meal Analysis

1. Navigate to **Nutrition** → **Analyze Meal**
2. Upload a photo of your meal
3. Get instant nutritional breakdown with:
   - Total calories
   - Macronutrients (protein, carbs, fats)
   - Individual food items
   - AI-generated insights and recommendations

### Workout Tracking

1. Go to **Workouts** → **Live Workout**
2. Allow camera access
3. Perform exercises in front of the camera
4. Watch real-time pose estimation and rep counting

### AI Assistant

1. Open the **AI Assistant** page
2. Ask questions like:
   - "How many calories should I eat today?"
   - "What's a good post-workout meal?"
   - "Help me plan my macros for muscle gain"
3. Get personalized, context-aware responses

### Nutrition Dashboard

1. View your daily progress on the **Dashboard**
2. Track calories, macros, and goals
3. Monitor your nutrition history
4. Adjust goals based on your fitness objectives

---

## 🛠️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern, fast web framework
- **[SQLAlchemy](https://www.sqlalchemy.org/)** - SQL toolkit and ORM
- **[Pydantic](https://docs.pydantic.dev/)** - Data validation
- **[JWT](https://jwt.io/)** - Authentication
- **[LangChain](https://www.langchain.com/)** - AI agent framework
- **[MediaPipe](https://mediapipe.dev/)** - Pose estimation
- **[OpenAI API](https://platform.openai.com/)** - GPT-4 Vision
- **[Google Gemini](https://ai.google.dev/)** - Vision AI

### Frontend
- **[React 18](https://react.dev/)** - UI library
- **[Vite](https://vitejs.dev/)** - Build tool
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[Zustand](https://zustand-demo.pmnd.rs/)** - State management
- **[React Router](https://reactrouter.com/)** - Routing
- **[Axios](https://axios-http.com/)** - HTTP client

### AI & Computer Vision
- **OpenAI GPT-4 Vision** - Meal recognition
- **Google Gemini Vision** - Alternative meal analysis
- **MediaPipe Pose** - Exercise tracking
- **LangChain** - AI assistant orchestration

---

## 🏗️ Architecture

```
HYPERFIT/
├── backend/              # FastAPI backend
│   ├── api/             # API routes
│   ├── core/            # Core functionality (auth, config, security)
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   └── schemas/         # Pydantic schemas
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── store/       # Zustand stores
│   │   └── utils/       # Utilities
│   └── public/          # Static assets
│
├── ai_modules/          # AI integration modules
│   ├── chat_assistant/  # LangChain assistant
│   ├── food_recognition/# Vision AI services
│   └── workout_tracking/# MediaPipe services
│
└── deployment/          # Deployment configs
    └── docker/          # Docker files
```

### API Structure

- **Authentication**: `/api/users/register`, `/api/users/login`
- **Nutrition**: `/api/food/analyze`, `/api/nutrition/`
- **Workouts**: `/api/workouts/`, `/api/activity/`
- **AI Assistant**: `/api/assistant/chat`
- **Vision**: `/api/vision/analyze`

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=sqlite:///./hyperfit.db

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Security
SECRET_KEY=your-secret-key-at-least-32-characters-long

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

---

## 📝 Development

### Running Tests

```bash
# Backend tests
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Backend linting
flake8 backend/
black backend/

# Frontend linting
cd frontend
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT-4 Vision API
- **Google** - Gemini Vision API
- **MediaPipe** - Pose estimation technology
- **LangChain** - AI agent framework
- **FastAPI** - Modern Python web framework
- **React** - UI library

---

<div align="center">

**Made with ❤️ for the fitness community**

[Documentation](https://github.com/yourusername/HYPERFIT/wiki) • 
[Issues](https://github.com/yourusername/HYPERFIT/issues) • 
[Discussions](https://github.com/yourusername/HYPERFIT/discussions)</div>
