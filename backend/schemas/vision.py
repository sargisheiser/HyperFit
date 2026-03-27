"""Schemas for AI vision-based meal analysis."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DetectedFoodItem(BaseModel):
    name: str
    quantity: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class VisionRequest(BaseModel):
    user_id: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=255)


class VisionResponse(BaseModel):
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    image_url: str
    note: str | None = None
    food_items: list[DetectedFoodItem] = Field(default_factory=list)
    confidence_score: float | None = Field(default=None, ge=0, le=1)
    insights: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    source: str | None = None


