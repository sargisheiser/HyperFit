"""Pydantic schemas for nutrition endpoints."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NutritionBase(BaseModel):
    user_id: int
    calories_goal: float = Field(gt=0)
    weight: float = Field(gt=0)
    calories_consumed: float = Field(default=0, ge=0)
    protein: Optional[float] = Field(default=None, ge=0)
    carbs: Optional[float] = Field(default=None, ge=0)
    fat: Optional[float] = Field(default=None, ge=0)


class NutritionStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    date: date
    calories_goal: float
    calories_consumed: float
    protein: float
    carbs: float
    fat: float
    weight: Optional[float] = None
    compliance: Optional[float] = None
    updated_at: Optional[datetime] = None


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
    compliance: Optional[float] = Field(default=None, ge=0, le=100)


class CheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    goal: str
    body_fat: Optional[float] = None
    calories_previous: Optional[float] = None
    calories_new: Optional[float] = None
    calories_change: Optional[float] = None
    compliance: Optional[float] = None


class AIOptimizationResponse(BaseModel):
    user_id: int
    current_calories: Optional[float] = None
    recommended_calories: float
    reasoning: str


class RecipeSuggestion(BaseModel):
    title: str
    calories: float
    protein: float
    carbs: float
    fat: float
    url: Optional[str] = None


class RecipesResponse(BaseModel):
    user_id: int
    suggestions: list[RecipeSuggestion]


class MealCreate(BaseModel):
    user_id: int
    calories: float = Field(ge=0)  # Allow 0 calories (e.g., for water, zero-calorie items)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)
    note: Optional[str] = Field(default=None, max_length=255)
    image_url: Optional[str] = Field(default=None, max_length=512)
    date: Optional[date] = None


class MealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date
    calories: float
    protein: float
    carbs: float
    fat: float
    note: Optional[str] = None
    image_url: Optional[str] = None


class MealAddResponse(BaseModel):
    status: str
    meal: MealRead
    daily: NutritionStats


class MealReadList(BaseModel):
    user_id: int
    meals: list[MealRead]


