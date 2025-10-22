# 🏋️ HYPERFIT - AI-Powered Fitness & Nutrition Platform

An intelligent fitness and nutrition tracking platform that uses AI and computer vision to help users improve their health and performance.

## 🚀 Features

- 📸 **AI Food Recognition**: Upload meal photos for automatic calorie and macro analysis
- 💪 **Workout Tracking**: Computer vision-based exercise detection and rep counting
- 🧠 **AI Assistant**: Personalized nutrition and workout recommendations
- 📊 **Analytics Dashboard**: Long-term health tracking and insights
- 🔗 **Wearable Integration**: Future support for fitness devices

## 🏗️ Architecture

```
HYPERFIT/
├── backend/           # FastAPI backend
├── frontend/          # React frontend (optional MVP)
├── ai_modules/        # AI/ML processing modules
├── database/          # Database models and migrations
├── utils/            # Shared utilities
├── tests/            # Test suites
├── docs/             # Documentation
└── deployment/        # Docker and deployment configs
```

## 🛠️ Tech Stack

- **Backend**: Python + FastAPI
- **Database**: SQLite → PostgreSQL
- **AI**: OpenAI GPT-4 Vision, MediaPipe, OpenCV
- **Frontend**: React + TailwindCSS
- **Deployment**: Docker + Render/Vercel

## 🚀 Quick Start

1. Clone the repository
2. Set up environment variables (see `.env.example`)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the backend: `uvicorn backend.main:app --reload`
5. Access the API docs at `http://localhost:8000/docs`

## 📝 License

MIT License - see LICENSE file for details
