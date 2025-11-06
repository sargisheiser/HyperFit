# HyperFit - Cyberpunk AI Fitness Dashboard

A production-ready, modular React + TailwindCSS fitness tracking application with a cyberpunk aesthetic and AI-powered features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:5173` (or your Vite port).

## 📁 Project Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── DashboardLayout.jsx
│   ├── StatusCard.jsx
│   ├── QuickActionCard.jsx
│   ├── ProgressBar.jsx
│   ├── AIButton.jsx
│   └── Tooltip.jsx
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Meals.jsx
│   ├── Workouts.jsx
│   └── AIAssistant.jsx
├── hooks/              # Custom React hooks
│   ├── useCalories.js
│   ├── useSteps.js
│   ├── useWorkouts.js
│   └── useMeals.js
├── styles/             # Theme and styling
│   ├── theme.js
│   └── globals.css (index.css)
├── services/           # API services
│   └── api.js
└── contexts/           # React contexts
    └── AuthContext.jsx
```

## 🎨 Design System

### Color Palette
- **Primary (Green)**: `#00FF88` - Main actions, success states
- **Secondary (Magenta)**: `#9D4EDD` - Secondary actions, highlights
- **Accent (Cyan)**: `#00FFFF` - Interactive elements, AI features
- **Warning (Pink)**: `#FF007F` - Alerts, warnings

### Typography
- **Headers**: Orbitron (futuristic, bold)
- **UI Text**: Rajdhani (clean, readable)
- **Terminal/Code**: VT323 (retro, monospace)

### Components

#### StatusCard
Displays a single stat with icon, label, value, and neon glow effect.

```jsx
<StatusCard
  label="MEALS LOGGED"
  value={mealCount}
  color="green"
  icon={Utensils}
  delay={0.1}
/>
```

#### QuickActionCard
Interactive card for quick actions with hover effects.

```jsx
<QuickActionCard
  title="LOG MEAL"
  description="ANALYZE FOOD WITH AI"
  color="green"
  icon={Utensils}
  navigateTo="/meals"
/>
```

#### ProgressBar
Animated progress bar with neon glow.

```jsx
<ProgressBar
  value={75}
  max={100}
  color="green"
  size="md"
  label="PROGRESS"
/>
```

## 🔧 Custom Hooks

### useCalories
Manages calorie tracking (in/out/net).

```jsx
const { calorieBalance, loading, refetch } = useCalories()
```

### useSteps
Manages step count and distance tracking.

```jsx
const { activityStats, addSteps, refetch } = useSteps()
```

### useWorkouts
Manages workout session tracking.

```jsx
const { workouts, workoutCount, createWorkout } = useWorkouts()
```

### useMeals
Manages meal logging and AI image recognition.

```jsx
const { meals, mealCount, totalCalories, analyzeMealImage } = useMeals()
```

## 🎯 Features

### Dashboard
- **System Status**: Overview of meals, workouts, and total calories
- **Activity Stats**: Steps, distance, and calories burned
- **Calorie System**: In/out/net calories with progress indicators
- **Quick Access**: Fast navigation to log meals, start workouts, add steps

### AI Integration
- **HyperAI Button**: Floating AI assistant button (top-right)
- **Meal Recognition**: AI-powered food analysis via camera upload
- **Workout Tracking**: Live pose detection and exercise recognition

## 🔮 Next Steps & Future Enhancements

### 1. AI Camera Food Recognition Module
- Integrate OpenAI Vision API for real-time food analysis
- Add barcode scanning for packaged foods
- Implement meal suggestion based on dietary goals

### 2. Workout Tracking via Motion Detection
- Real-time pose estimation using MediaPipe
- Exercise form correction and rep counting
- Workout recommendations based on progress

### 3. Wearable Device Integration
- Connect to Fitbit, Apple Watch, or Garmin APIs
- Sync steps, heart rate, and sleep data
- Automatic calorie burn calculation

### 4. Advanced Analytics
- Weekly/monthly progress charts
- Macro nutrient breakdown (carbs, protein, fat)
- Body composition tracking
- Goal setting and achievement system

### 5. Social Features
- Share workouts and achievements
- Leaderboards and challenges
- Community feed

## 🛠️ Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 📝 API Integration

The app expects a FastAPI backend running on `http://localhost:8000` with the following endpoints:

- `GET /api/meals/` - Fetch meals
- `POST /api/meals/` - Create meal
- `POST /api/meals/analyze` - Analyze meal image
- `GET /api/workouts/` - Fetch workouts
- `POST /api/workouts/` - Create workout
- `GET /api/activity/` - Fetch activity stats
- `POST /api/activity/steps` - Add steps
- `GET /api/activity/calorie-balance` - Get calorie balance

## 🎨 Styling Guidelines

1. **Use theme colors** from `styles/theme.js` for consistency
2. **Apply neon glow effects** using the `card-cyber` classes
3. **Use uppercase text** for labels and buttons (cyberpunk aesthetic)
4. **Maintain sharp edges** (no border-radius) for cards
5. **Add hover effects** with glow and scale transformations

## 📄 License

Proprietary - HyperFit / MCI App Ecosystem
