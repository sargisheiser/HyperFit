"""Pydantic schemas for nutrition endpoints."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class NutritionBase(BaseModel):
    user_id: int
    calories_goal: float = Field(gt=0)
    weight: float = Field(gt=0)
    calories_consumed: float = Field(default=0, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)


class NutritionStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    date: date
    calories_goal: float
    calories_consumed: float
    protein: float
    carbs: float
    fat: float
    weight: float | None = None
    compliance: float | None = None
    updated_at: datetime | None = None


class WeightUpdate(BaseModel):
    user_id: int
    weight: float = Field(gt=0)


class WeightLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    weight: float


class CheckIn(BaseModel):
    user_id: int
    goal: str
    body_fat: float = Field(ge=0, le=100)
    calories_previous: float = Field(gt=0)
    calories_new: float = Field(gt=0)
    compliance: float | None = Field(default=None, ge=0, le=100)


class CheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    goal: str
    body_fat: float | None = None
    calories_previous: float | None = None
    calories_new: float | None = None
    calories_change: float | None = None
    compliance: float | None = None


class AIOptimizationResponse(BaseModel):
    user_id: int
    current_calories: float | None = None
    recommended_calories: float
    reasoning: str


class RecipeSuggestion(BaseModel):
    title: str
    calories: float
    protein: float
    carbs: float
    fat: float
    url: str | None = None


class RecipesResponse(BaseModel):
    user_id: int
    suggestions: list[RecipeSuggestion]


class MealCreate(BaseModel):
    user_id: int
    calories: float = Field(ge=0)  # Allow 0 calories (e.g., for water, zero-calorie items)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)
    note: str | None = Field(default=None, max_length=255)
    image_url: str | None = Field(default=None, max_length=512)
    date: date | None = None


class MealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    calories: float
    protein: float
    carbs: float
    fat: float
    note: str | None = None
    image_url: str | None = None


class MealAddResponse(BaseModel):
    status: str
    meal: MealRead
    daily: NutritionStats


class MealReadList(BaseModel):
    user_id: int
    meals: list[MealRead]


