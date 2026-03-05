"""Database models for activity tracking (steps, calories burned, distance)."""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base


class Activity(Base):
    """Daily activity tracking (steps, calories burned, distance)."""

    __tablename__ = "activities"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_activity_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, default=datetime.utcnow, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    calories_burned: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="activities")


