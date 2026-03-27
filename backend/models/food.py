"""Database and schema models for food recognition logs."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.database import Base


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_path = Column(String(500), nullable=True)  # Made nullable for manual entries
    total_calories = Column(Float, nullable=True)
    macronutrients = Column(JSON, nullable=True)
    food_items = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)
    raw_response = Column(JSON, nullable=True)
    is_manual = Column(Integer, default=0, nullable=False)  # 0 = AI analyzed, 1 = manual
    is_corrected = Column(Integer, default=0, nullable=False)  # 0 = original, 1 = corrected
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="food_logs")


class FoodAnalysisCreate(BaseModel):
    user_context: dict[str, Any] | None = None


class FoodItem(BaseModel):
    name: str
    quantity: str | None = None
    confidence: float | None = None


class Macronutrients(BaseModel):
    protein_grams: float
    carbs_grams: float
    fat_grams: float
    fiber_grams: float | None = None
    sugar_grams: float | None = None


class FoodAnalysisResult(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    food_items: list[FoodItem]
    total_calories: float
    macronutrients: Macronutrients
    confidence_score: float
    analysis_details: dict[str, Any] | None = None
    processing_time_seconds: float | None = None
    model_used: str | None = None


class FoodLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_path: str | None = None
    total_calories: float | None
    macronutrients: dict[str, Any] | None
    food_items: list[dict[str, Any]] | None
    confidence_score: float | None
    created_at: datetime
    is_manual: bool | None = False
    is_corrected: bool | None = False
    note: str | None = None

    @classmethod
    def from_orm(cls, obj: FoodLog) -> "FoodLogRead":
        """Convert FoodLog ORM object to FoodLogRead."""
        return cls(
            id=obj.id,
            image_path=obj.image_path,
            total_calories=obj.total_calories,
            macronutrients=obj.macronutrients,
            food_items=obj.food_items,
            confidence_score=obj.confidence_score,
            created_at=obj.created_at,
            is_manual=bool(obj.is_manual) if obj.is_manual is not None else False,
            is_corrected=bool(obj.is_corrected) if obj.is_corrected is not None else False,
            note=obj.note,
        )


class ManualMealCreate(BaseModel):
    """Schema for manually creating a meal entry."""
    food_items: list[dict[str, Any]] = Field(..., description="List of food items with nutrition data")
    total_calories: float | None = None
    macronutrients: dict[str, Any] | None = None
    note: str | None = None


class MealCorrection(BaseModel):
    """Schema for correcting an existing meal analysis."""
    food_log_id: int
    food_items: list[dict[str, Any]] | None = None
    total_calories: float | None = None
    macronutrients: dict[str, Any] | None = None
    note: str | None = None


class ProductSearchResult(BaseModel):
    """Schema for product search results from Open Food Facts."""
    name: str
    barcode: str | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    carbs_per_100g: float | None = None
    fat_per_100g: float | None = None
    image_url: str | None = None
    brand: str | None = None
    quantity: str | None = None



