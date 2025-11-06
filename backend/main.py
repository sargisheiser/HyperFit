"""
HYPERFIT Backend - FastAPI Application
Main application entry point with all API routes and middleware configuration.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
from backend.logging_config import get_logger
logger = get_logger(__name__)

# Import API routers
from backend.api import users, meals, workouts, activity, websocket, chat, agent
from backend.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    print("🚀 Starting HYPERFIT Backend...")
    # Initialize database, AI models, etc.
    yield
    # Shutdown
    print("🛑 Shutting down HYPERFIT Backend...")

# Create FastAPI application
app = FastAPI(
    title="HYPERFIT API",
    description="AI-Powered Fitness & Nutrition Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "🏋️ Welcome to HYPERFIT API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "HYPERFIT Backend"}

# Include API routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(meals.router, prefix="/api/meals", tags=["meals"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["workouts"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(agent.router, prefix="/api", tags=["agent"])
app.include_router(websocket.router, tags=["websocket"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True").lower() == "true"
    )
    