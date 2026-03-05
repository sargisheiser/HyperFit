"""Pydantic models for dashboard aggregates."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DashboardSummary(BaseModel):
    """Light-weight overview for dashboard cards."""

    total_workouts: int = Field(ge=0)
    total_meals: int = Field(ge=0)
    total_calories_burned: float = Field(ge=0)
    average_calories_per_meal: Optional[float] = Field(default=None, ge=0)
    last_workout_at: Optional[datetime] = None
    last_meal_logged_at: Optional[datetime] = None
    assistant_interactions: int = Field(ge=0, default=0)


class DashboardOverview(BaseModel):
    """Primary dashboard response returned by `/dashboard/overview`."""

    summary: DashboardSummary
    latest_workout: Optional[dict] = None
    latest_meal: Optional[dict] = None









