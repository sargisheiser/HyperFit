"""Daily nutrition stats, aggregation, and AI optimization."""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from backend.models.food import FoodLog
from backend.models.nutrition import DailyNutrition, Meal, NutritionCheckIn, WeightLog
from backend.models.user import User
from backend.schemas.nutrition import AIOptimizationResponse, NutritionBase, NutritionStats
from backend.services.nutrition_calculator import GOAL_ADJUSTMENTS, _calculate_macros

logger = logging.getLogger(__name__)


def _today() -> date:
    return date.today()


def _get_user_calorie_goal(user: User, db: Session) -> float:
    """Get calorie goal from user profile or calculate from profile data."""
    if user.daily_calorie_target and user.daily_calorie_target > 0:
        return float(user.daily_calorie_target)

    latest_daily = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == user.id)
        .order_by(DailyNutrition.date.desc())
        .first()
    )
    if latest_daily and latest_daily.calories_goal and latest_daily.calories_goal > 0:
        return latest_daily.calories_goal

    if user.weight_kg and user.height_cm and user.birth_date:
        today = date.today()
        age = today.year - user.birth_date.year
        if (today.month, today.day) < (user.birth_date.month, user.birth_date.day):
            age -= 1
        if user.gender == "female":
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age - 161
        else:
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age + 5

        activity_multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        multiplier = activity_multipliers.get(user.activity_level or "moderate", 1.55)
        tdee = bmr * multiplier
        return round(tdee + 500, 0)

    return 2500.0


def _aggregate_meals_for_date(user_id: int, target_date: date, db: Session) -> dict[str, float]:
    """Aggregate all meals and food logs for a specific date."""
    meals = db.query(Meal).filter(Meal.user_id == user_id, Meal.date == target_date).all()

    start_datetime = datetime.combine(target_date, datetime.min.time())
    end_datetime = datetime.combine(target_date, datetime.max.time()) + timedelta(days=1)
    food_logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == user_id, FoodLog.created_at >= start_datetime, FoodLog.created_at < end_datetime)
        .all()
    )

    total_calories = sum(meal.calories or 0.0 for meal in meals)
    total_protein = sum(meal.protein or 0.0 for meal in meals)
    total_carbs = sum(meal.carbs or 0.0 for meal in meals)
    total_fat = sum(meal.fat or 0.0 for meal in meals)

    for log in food_logs:
        total_calories += log.total_calories or 0.0
        if log.macronutrients:
            macros = log.macronutrients
            if isinstance(macros, str):
                try:
                    macros = json.loads(macros)
                except (json.JSONDecodeError, TypeError):
                    macros = {}
            if isinstance(macros, dict):
                total_protein += macros.get("protein_grams", 0.0) or 0.0
                total_carbs += macros.get("carbs_grams", 0.0) or 0.0
                total_fat += macros.get("fat_grams", 0.0) or 0.0

    return {
        "calories_consumed": round(total_calories, 1),
        "protein": round(total_protein, 1),
        "carbs": round(total_carbs, 1),
        "fat": round(total_fat, 1),
    }


def get_daily_nutrition(user_id: int, db: Session, target_date: date | None = None) -> NutritionStats:
    """Get daily nutrition stats, aggregating from all meals."""
    if target_date is None:
        target_date = _today()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")

    calories_goal = _get_user_calorie_goal(user, db)
    record = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == user_id, DailyNutrition.date == target_date)
        .one_or_none()
    )

    aggregated = _aggregate_meals_for_date(user_id, target_date, db)

    current_weight = user.weight_kg
    if not current_weight:
        latest_weight_log = (
            db.query(WeightLog).filter(WeightLog.user_id == user_id).order_by(WeightLog.date.desc()).first()
        )
        if latest_weight_log:
            current_weight = latest_weight_log.weight

    _calculate_macros(current_weight, calories_goal, protein_target=user.daily_protein_target or None)

    if record:
        record.calories_consumed = aggregated["calories_consumed"]
        record.protein = aggregated["protein"]
        record.carbs = aggregated["carbs"]
        record.fat = aggregated["fat"]
        if record.calories_goal != calories_goal:
            record.calories_goal = calories_goal
        if current_weight:
            record.weight = current_weight
        record.compliance = (
            round((record.calories_consumed / record.calories_goal) * 100, 1)
            if record.calories_goal and record.calories_goal > 0
            else None
        )
        db.commit()
        db.refresh(record)
        return NutritionStats.model_validate(record)

    record = DailyNutrition(
        user_id=user_id,
        date=target_date,
        calories_goal=calories_goal,
        calories_consumed=aggregated["calories_consumed"],
        protein=aggregated["protein"],
        carbs=aggregated["carbs"],
        fat=aggregated["fat"],
        weight=current_weight,
        compliance=round((aggregated["calories_consumed"] / calories_goal * 100), 1) if calories_goal > 0 else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return NutritionStats.model_validate(record)


def update_daily_nutrition(payload: NutritionBase, db: Session) -> NutritionStats:
    """Update daily nutrition."""
    today = _today()
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise ValueError(f"User {payload.user_id} not found")

    calories_goal = payload.calories_goal
    if not calories_goal or calories_goal == 0:
        calories_goal = _get_user_calorie_goal(user, db)
    elif user.daily_calorie_target != calories_goal:
        user.daily_calorie_target = int(calories_goal)
        db.commit()

    record = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == payload.user_id, DailyNutrition.date == today)
        .one_or_none()
    )

    weight = payload.weight or user.weight_kg
    if not weight:
        latest = db.query(WeightLog).filter(WeightLog.user_id == payload.user_id).order_by(WeightLog.date.desc()).first()
        if latest:
            weight = latest.weight

    aggregated = _aggregate_meals_for_date(payload.user_id, today, db)
    compliance = round((aggregated["calories_consumed"] / calories_goal) * 100, 1) if calories_goal > 0 else None

    if record:
        record.calories_goal = calories_goal
        record.calories_consumed = aggregated["calories_consumed"]
        record.protein = aggregated["protein"]
        record.carbs = aggregated["carbs"]
        record.fat = aggregated["fat"]
        record.weight = weight
        record.compliance = compliance
    else:
        record = DailyNutrition(
            user_id=payload.user_id,
            date=today,
            calories_goal=calories_goal,
            calories_consumed=aggregated["calories_consumed"],
            protein=aggregated["protein"],
            carbs=aggregated["carbs"],
            fat=aggregated["fat"],
            weight=weight,
            compliance=compliance,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return NutritionStats.model_validate(record)


def _latest_daily_record(user_id: int, db: Session) -> DailyNutrition | None:
    return db.query(DailyNutrition).filter(DailyNutrition.user_id == user_id).order_by(DailyNutrition.date.desc()).first()


def _latest_checkin(user_id: int, db: Session) -> NutritionCheckIn | None:
    return db.query(NutritionCheckIn).filter(NutritionCheckIn.user_id == user_id).order_by(NutritionCheckIn.date.desc()).first()


def ai_optimize(user_id: int, db: Session) -> AIOptimizationResponse:
    daily = _latest_daily_record(user_id, db)
    checkin = _latest_checkin(user_id, db)

    if not daily and not checkin:
        raise ValueError("No nutrition context available for user")

    base_calories = daily.calories_goal if daily else checkin.calories_new or checkin.calories_previous
    goal = checkin.goal if checkin else "maintain"
    adjustment = GOAL_ADJUSTMENTS.get(goal, 0)

    compliance = daily.compliance if daily and daily.compliance is not None else None
    if compliance and compliance < 80:
        adjustment -= 100

    recommended = max(base_calories + adjustment, 1200)
    reasoning = (
        f"Adjusted {adjustment:+.0f} calories based on goal '{goal}'"
        f"{' and recent compliance trends' if compliance is not None else ''}."
    )

    return AIOptimizationResponse(
        user_id=user_id,
        current_calories=base_calories,
        recommended_calories=round(recommended, 0),
        reasoning=reasoning,
    )
