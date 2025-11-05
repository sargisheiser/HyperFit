# HYPERFIT Frontend

Modern, minimalistic React UI for testing HYPERFIT features.

## 🚀 Quick Start

### Install Dependencies
```bash
cd frontend
npm install
```

### Start Development Server
```bash
npm run dev
```

The app will be available at http://localhost:3000

## 📋 Features

- ✅ User Authentication (Login/Register)
- ✅ Dashboard with stats
- ✅ Meal Tracking with AI Analysis
- ✅ Workout Tracking
- ✅ Modern, responsive UI
- ✅ Real-time data updates

## 🎨 Tech Stack

- React 18
- Vite
- TailwindCSS
- React Router
- Axios
- Lucide Icons

## 🔧 Configuration

The frontend automatically connects to the backend at `http://localhost:8000`.

To change the API URL, create a `.env` file:
```
VITE_API_URL=http://localhost:8000
```

## 📱 Pages

- `/login` - User login
- `/register` - User registration
- `/dashboard` - Overview and stats
- `/meals` - Meal tracking with AI analysis
- `/workouts` - Workout tracking

## 🧪 Testing

1. Start the backend: `python start_server.py`
2. Start the frontend: `npm run dev`
3. Register a new account
4. Upload a food image to test AI analysis
5. Add workouts to test tracking

Enjoy testing HYPERFIT! 🏋️
