"""Expose modular API routers for the application."""

from fastapi import APIRouter

from backend.api.activity_router import router as activity_router
from backend.api.assistant_router import router as assistant_router
from backend.api.auth_router import router as auth_router
from backend.api.dashboard_router import router as dashboard_router
from backend.api.meal_router import router as meal_router
from backend.api.nutrition import router as nutrition_router
from backend.api.workout_router import router as workout_router, ws_router as workout_ws_router
from backend.api.vision import router as vision_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, prefix="/users", tags=["users"])
api_router.include_router(workout_router, prefix="/workouts", tags=["workouts"])
api_router.include_router(meal_router, prefix="/food", tags=["food"])
api_router.include_router(assistant_router, prefix="/assistant", tags=["assistant"])
api_router.include_router(nutrition_router, tags=["nutrition"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(vision_router, tags=["vision"])
api_router.include_router(activity_router, prefix="/activity", tags=["activity"])

websocket_router = APIRouter()
websocket_router.include_router(workout_ws_router, tags=["realtime"])

__all__ = ["api_router", "websocket_router"]
