"""Schemas for AI vision-based meal analysis."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class DetectedFoodItem(BaseModel):
    name: str
    quantity: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


class VisionRequest(BaseModel):
    user_id: int = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=255)


class VisionResponse(BaseModel):
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    image_url: str
    note: Optional[str] = None
    food_items: List[DetectedFoodItem] = Field(default_factory=list)
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    insights: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    source: Optional[str] = None


