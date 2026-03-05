"""Database and schema models for food recognition logs."""

from datetime import datetime
from typing import Any, Dict, List, Optional

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
    user_context: Optional[Dict[str, Any]] = None


class FoodItem(BaseModel):
    name: str
    quantity: Optional[str] = None
    confidence: Optional[float] = None


class Macronutrients(BaseModel):
    protein_grams: float
    carbs_grams: float
    fat_grams: float
    fiber_grams: Optional[float] = None
    sugar_grams: Optional[float] = None


class FoodAnalysisResult(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    food_items: List[FoodItem]
    total_calories: float
    macronutrients: Macronutrients
    confidence_score: float
    analysis_details: Optional[Dict[str, Any]] = None
    processing_time_seconds: Optional[float] = None
    model_used: Optional[str] = None


class FoodLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_path: Optional[str] = None
    total_calories: Optional[float]
    macronutrients: Optional[Dict[str, Any]]
    food_items: Optional[List[Dict[str, Any]]]
    confidence_score: Optional[float]
    created_at: datetime
    is_manual: Optional[bool] = False
    is_corrected: Optional[bool] = False
    note: Optional[str] = None

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
    food_items: List[Dict[str, Any]] = Field(..., description="List of food items with nutrition data")
    total_calories: Optional[float] = None
    macronutrients: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


class MealCorrection(BaseModel):
    """Schema for correcting an existing meal analysis."""
    food_log_id: int
    food_items: Optional[List[Dict[str, Any]]] = None
    total_calories: Optional[float] = None
    macronutrients: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


class ProductSearchResult(BaseModel):
    """Schema for product search results from Open Food Facts."""
    name: str
    barcode: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[str] = None



