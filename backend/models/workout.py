"""Database and schema models for workout tracking."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.database import Base


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=True)
    workout_type = Column(String(100), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    calories_burned = Column(Float, nullable=True)
    intensity_level = Column(String(50), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_metadata = Column(JSON, nullable=True)
    video_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="workouts")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    name = Column(String(255), nullable=False)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    form_score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)

    workout = relationship("Workout", back_populates="exercises")


class ExerciseCreate(BaseModel):
    name: str = Field(..., max_length=255)
    sets: Optional[int] = Field(default=None, ge=0)
    reps: Optional[int] = Field(default=None, ge=0)
    weight_kg: Optional[float] = Field(default=None, ge=0)
    duration_seconds: Optional[int] = Field(default=None, ge=0)


class ExerciseRead(ExerciseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_score: Optional[float] = None
    confidence: Optional[float] = None


class WorkoutBase(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    workout_type: Optional[str] = Field(default=None, max_length=100)
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    intensity_level: Optional[str] = Field(default=None, max_length=50)


class WorkoutCreate(WorkoutBase):
    exercises: Optional[List[ExerciseCreate]] = None
    video_path: Optional[str] = None


class WorkoutRead(WorkoutBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    calories_burned: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_metadata: Optional[Dict[str, Any]] = None
    video_path: Optional[str] = None
    exercises: List[ExerciseRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


class WorkoutAnalysisRequest(BaseModel):
    workout_type: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None


class WorkoutHistoryCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    exercise: Optional[str] = Field(default=None, max_length=255)
    workout_type: Optional[str] = Field(default=None, max_length=100)
    reps: Optional[int] = Field(default=None, ge=0)
    calories_burned: Optional[float] = Field(default=None, ge=0)
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    feedback: Optional[List[str]] = None
    notes: Optional[str] = None


class WorkoutAnalysisResult(BaseModel):
    detected_exercises: List[Dict[str, Any]]
    total_reps: int
    total_sets: int
    estimated_calories: float
    form_analysis: Dict[str, Any]
    confidence_score: float
    video_duration: float
    processing_time_seconds: float
