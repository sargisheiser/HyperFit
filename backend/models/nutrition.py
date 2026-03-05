"""Database models for nutrition tracking."""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base


class DailyNutrition(Base):
    """Daily calorie and macronutrient summary per user."""

    __tablename__ = "daily_nutrition"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_nutrition_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    calories_goal: Mapped[float] = mapped_column(Float, nullable=False)
    calories_consumed: Mapped[float] = mapped_column(Float, default=0.0)
    protein: Mapped[float] = mapped_column(Float, default=0.0)
    carbs: Mapped[float] = mapped_column(Float, default=0.0)
    fat: Mapped[float] = mapped_column(Float, default=0.0)
    weight: Mapped[Optional[float]] = mapped_column(Float, default=None)
    compliance: Mapped[Optional[float]] = mapped_column(Float, default=None)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="daily_nutrition")


class WeightLog(Base):
    """User bodyweight history."""

    __tablename__ = "weight_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    weight: Mapped[float] = mapped_column(Float, nullable=False)

    user = relationship("User", back_populates="weight_logs")


class NutritionCheckIn(Base):
    """Weekly/periodic nutrition check-ins."""

    __tablename__ = "nutrition_checkins"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    goal: Mapped[str] = mapped_column(String(50), nullable=False)
    body_fat: Mapped[Optional[float]] = mapped_column(Float, default=None)
    calories_change: Mapped[Optional[float]] = mapped_column(Float, default=None)
    calories_previous: Mapped[Optional[float]] = mapped_column(Float, default=None)
    calories_new: Mapped[Optional[float]] = mapped_column(Float, default=None)
    compliance: Mapped[Optional[float]] = mapped_column(Float, default=None)

    user = relationship("User", back_populates="nutrition_checkins")


class Meal(Base):
    """Individual meals contributing to a user's daily nutrition."""

    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=datetime.utcnow)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), default=None)
    note: Mapped[Optional[str]] = mapped_column(String(255), default=None)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    carbs: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="meals")


