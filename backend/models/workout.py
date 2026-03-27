"""Database and schema models for workout tracking."""

from datetime import datetime
from typing import Any

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
    sets: int | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)


class ExerciseRead(ExerciseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_score: float | None = None
    confidence: float | None = None


class WorkoutBase(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    workout_type: str | None = Field(default=None, max_length=100)
    duration_minutes: int | None = Field(default=None, ge=0)
    intensity_level: str | None = Field(default=None, max_length=50)


class WorkoutCreate(WorkoutBase):
    exercises: list[ExerciseCreate] | None = None
    video_path: str | None = None


class WorkoutRead(WorkoutBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    calories_burned: float | None = None
    ai_summary: str | None = None
    ai_metadata: dict[str, Any] | None = None
    video_path: str | None = None
    exercises: list[ExerciseRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class WorkoutAnalysisRequest(BaseModel):
    workout_type: str | None = None
    user_context: dict[str, Any] | None = None


class WorkoutHistoryCreate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    exercise: str | None = Field(default=None, max_length=255)
    workout_type: str | None = Field(default=None, max_length=100)
    reps: int | None = Field(default=None, ge=0)
    calories_burned: float | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    feedback: list[str] | None = None
    notes: str | None = None


class WorkoutAnalysisResult(BaseModel):
    detected_exercises: list[dict[str, Any]]
    total_reps: int
    total_sets: int
    estimated_calories: float
    form_analysis: dict[str, Any]
    confidence_score: float
    video_duration: float
    processing_time_seconds: float
