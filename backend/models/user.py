"""Database and schema models for user entities."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.database import Base


class User(Base):
    """SQLAlchemy model representing an authenticated user."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    birth_date = Column(Date, nullable=True)
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    activity_level = Column(String(50), nullable=True)
    fitness_goals = Column(Text, nullable=True)
    dietary_preferences = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    daily_calorie_target = Column(Integer, nullable=True)
    daily_protein_target = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    onboarding_complete = Column(Boolean, default=False)
    reset_token = Column(String(255), nullable=True, index=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    workouts = relationship("Workout", back_populates="user")
    food_logs = relationship("FoodLog", back_populates="user")
    daily_nutrition = relationship("DailyNutrition", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    nutrition_checkins = relationship("NutritionCheckIn", back_populates="user")
    meals = relationship("Meal", back_populates="user")
    activities = relationship("Activity", back_populates="user")
    subscription = relationship("Subscription", back_populates="user", uselist=False)

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User id={self.id} email={self.email!r}>"


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    full_name: str | None = Field(default=None, max_length=255)
    birth_date: date | None = None
    height_cm: int | None = Field(default=None, ge=100, le=250)
    weight_kg: int | None = Field(default=None, ge=35, le=300)
    gender: str | None = Field(default=None, max_length=20)
    activity_level: str | None = Field(default=None, max_length=50)
    fitness_goals: list[str] | None = None
    dietary_preferences: list[str] | None = None
    allergies: list[str] | None = None
    daily_calorie_target: int | None = Field(default=None, ge=1000, le=10000)
    daily_protein_target: int | None = Field(default=None, ge=50, le=500)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile (all fields optional)."""
    full_name: str | None = Field(default=None, max_length=255)
    birth_date: date | None = None
    height_cm: int | None = Field(default=None, ge=100, le=250)
    weight_kg: int | None = Field(default=None, ge=35, le=300)
    gender: str | None = Field(default=None, max_length=20)
    activity_level: str | None = Field(default=None, max_length=50)
    fitness_goals: list[str] | None = None
    dietary_preferences: list[str] | None = None
    allergies: list[str] | None = None
    daily_calorie_target: int | None = Field(default=None, ge=1000, le=10000)
    daily_protein_target: int | None = Field(default=None, ge=50, le=500)
    onboarding_complete: bool | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    is_verified: bool
    onboarding_complete: bool = False
    created_at: datetime
    updated_at: datetime | None = None
    last_login: datetime | None = None


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    user_id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
