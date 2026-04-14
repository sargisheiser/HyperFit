"""Meal, weight, and check-in CRUD operations."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from backend.models.nutrition import DailyNutrition, Meal, NutritionCheckIn, WeightLog
from backend.models.user import User
from backend.schemas.nutrition import (
    CheckIn,
    CheckInRead,
    MealAddResponse,
    MealCreate,
    MealRead,
    MealReadList,
    WeightLogRead,
    WeightUpdate,
)
from backend.services.nutrition_calculator import _normalize_goal
from backend.services.nutrition_stats import (
    _aggregate_meals_for_date,
    _get_user_calorie_goal,
    _today,
)

logger = logging.getLogger(__name__)


def add_meal(payload: MealCreate, db: Session) -> MealAddResponse:
    """Add a meal and update daily nutrition."""
    from backend.schemas.nutrition import NutritionStats

    meal_date = payload.date or _today()
    meal = Meal(
        user_id=payload.user_id,
        date=meal_date,
        calories=payload.calories or 0.0,
        protein=payload.protein or 0.0,
        carbs=payload.carbs or 0.0,
        fat=payload.fat or 0.0,
        note=payload.note,
        image_url=payload.image_url,
    )
    db.add(meal)
    db.flush()

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise ValueError(f"User {payload.user_id} not found")

    calories_goal = _get_user_calorie_goal(user, db)
    daily = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == payload.user_id, DailyNutrition.date == meal_date)
        .one_or_none()
    )

    if not daily:
        daily = DailyNutrition(
            user_id=payload.user_id,
            date=meal_date,
            calories_goal=calories_goal,
            calories_consumed=0.0,
            protein=0.0,
            carbs=0.0,
            fat=0.0,
            weight=user.weight_kg,
        )
        db.add(daily)
    elif daily.calories_goal != calories_goal:
        daily.calories_goal = calories_goal

    db.flush()
    aggregated = _aggregate_meals_for_date(payload.user_id, meal_date, db)

    daily.calories_consumed = aggregated["calories_consumed"]
    daily.protein = aggregated["protein"]
    daily.carbs = aggregated["carbs"]
    daily.fat = aggregated["fat"]

    if daily.calories_goal and daily.calories_goal > 0:
        daily.compliance = round((daily.calories_consumed / daily.calories_goal) * 100, 1)
    else:
        daily.compliance = None

    db.commit()
    db.refresh(meal)
    db.refresh(daily)

    return MealAddResponse(
        status="saved",
        meal=MealRead.model_validate(meal),
        daily=NutritionStats.model_validate(daily),
    )


def list_meals(user_id: int, db: Session, limit: int = 20) -> MealReadList:
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user_id)
        .order_by(Meal.date.desc(), Meal.created_at.desc())
        .limit(limit)
        .all()
    )
    return MealReadList(
        user_id=user_id,
        meals=[MealRead.model_validate(m) for m in meals],
    )


def log_weight(payload: WeightUpdate, db: Session) -> WeightLogRead:
    entry = WeightLog(user_id=payload.user_id, weight=payload.weight, date=_today())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return WeightLogRead.model_validate(entry)


def record_checkin(payload: CheckIn, db: Session) -> CheckInRead:
    normalized_goal = _normalize_goal(payload.goal)
    calories_change = payload.calories_new - payload.calories_previous
    record = NutritionCheckIn(
        user_id=payload.user_id,
        goal=normalized_goal,
        body_fat=payload.body_fat,
        calories_previous=payload.calories_previous,
        calories_new=payload.calories_new,
        calories_change=calories_change,
        compliance=payload.compliance,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return CheckInRead.model_validate(record)
