# HYPERFIT – Hyper-Futuristic Mentor Lab

HyperFit is an AI-first fitness companion. The platform unifies an LLM assistant, MediaPipe movement recognition, and AI-powered nutrition analysis inside a modern React dashboard.

## Highlights

- **LangChain mentor** powered by OpenAI GPT-4o with workout and meal tools
- **MediaPipe/OpenCV** video analysis with real-time WebSocket feedback (`/ws/workout-live`)
- **Google Gemini Vision** meal recognition returning calories, macros, and confidence scores
- **Modular FastAPI backend** with SQLite + SQLAlchemy models and JWT auth
- **React + Tailwind + Framer Motion** frontend with neon-glass aesthetic & GSAP hovers
- **Docker Compose** for local orchestration (`backend:8000`, `frontend:3000`)

## Project Structure

```
HYPERFIT/
├── backend/
│   ├── api/routes/            # FastAPI routers (users, workouts, food, assistant)
│   ├── core/                  # config, database, security helpers
│   ├── models/                # SQLAlchemy + Pydantic models
│   ├── services/              # Domain services (vision, chat, workout analysis)
│   ├── tests/                 # Pytest suites
│   └── main.py                # FastAPI entrypoint
├── frontend/
│   ├── src/components/        # Navbar, Sidebar, NeonCard, charts, etc.
│   ├── src/pages/             # Dashboard, AI Assistant, Workout Tracker, Meal Analyzer, Auth
│   ├── src/services/api.js    # Axios client
│   └── Dockerfile             # Vite build + nginx serve
├── ai_modules/                # MediaPipe + Gemini Vision helpers (reused by services)
├── docker-compose.yml         # Backend + frontend orchestration
├── env.example                # Environment variable template
├── requirements.txt           # Backend dependencies (FastAPI, LangChain, OpenAI, MediaPipe)
└── README.md
```

## Backend Setup

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env             # fill in OPENAI_API_KEY, SECRET_KEY, etc.
uvicorn backend.main:app --reload
```

Key environment variables (see `.env.example`):

- `OPENAI_API_KEY` – required for chat + vision endpoints
- `DATABASE_URL` – defaults to `sqlite:///./hyperfit.db`
- `SECRET_KEY` – JWT signing key
- `OPENAI_MODEL` – e.g. `gpt-4o-mini`

### Core Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/users/register` | Register user, returns profile |
| `POST` | `/api/users/login` | JWT auth (`Bearer <token>`) |
| `GET`  | `/api/users/me` | Authenticated profile |
| `POST` | `/api/workouts/analyze` | Upload workout video, returns AI analysis + persists workout |
| `GET`  | `/api/workouts` | List workouts for authenticated user |
| `POST` | `/api/food/analyze` | Upload food image for Gemini vision analysis |
| `GET`  | `/api/food` | Nutrition analysis history |
| `POST` | `/api/assistant/chat` | LangChain assistant response |

**WebSocket:** `ws://localhost:8000/ws/workout-live` streams base64 video frames ↔ live pose metrics.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Set `VITE_API_URL` in `.env` if the backend is hosted elsewhere (defaults to `http://localhost:8000`).

### Frontend Routes

- `/login`, `/register` – Authentication screens
- `/dashboard` – Overview cards, AI assistant teaser, workout analytics, quick actions
- `/ai-assistant` – LangChain chat interface with tool integrations
- `/workout-tracker` – Launches webcam tracker overlay using WebSocket feed
- `/meal-analyzer` – Capture/upload meals, watch Gemini insights & history

## Docker Compose

```bash
docker compose up --build
# backend → http://localhost:8000
# frontend → http://localhost:3000 (Vite dev server or nginx build)
```

## Testing

```bash
pytest backend/tests
```

## Notes

- Media uploads persist to `backend/uploads/`
- SQLite DB defaults to `hyperfit.db` at repo root
- Swap in Postgres by updating `DATABASE_URL`
- Ensure GPU drivers/OpenCV requirements are met for MediaPipe operations

## License

MIT


