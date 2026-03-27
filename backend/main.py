"""FastAPI application entry point for the HyperFit backend."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api import api_router, websocket_router
from backend.core.config import settings
from backend.core.database import create_tables
from backend.core.rate_limit import limiter, rate_limit_exceeded_handler
from backend.core.security_middleware import SecurityHeadersMiddleware

try:
    from backend.core.rate_limit import RateLimitExceeded
except ImportError:
    RateLimitExceeded = Exception  # type: ignore


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="HYPERFIT API",
    description="AI-Powered Fitness & Nutrition Platform",
    version=settings.app_version,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Security headers middleware (add first to apply to all responses)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.cors_origins_list else ["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Explicit methods instead of "*"
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],  # Explicit headers
    expose_headers=["Content-Type", "X-Total-Count"],  # Only expose necessary headers
)

uploads_dir = Path(settings.upload_dir)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "🏋️ Welcome to HYPERFIT API",
        "version": settings.app_version,
        "docs": "/docs",
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "HYPERFIT Backend"}


app.include_router(api_router)
app.include_router(websocket_router)
