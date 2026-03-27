"""Dashboard aggregation service."""

from __future__ import annotations

from statistics import mean

from sqlalchemy.orm import Session

from backend.models.dashboard import DashboardOverview, DashboardSummary
from backend.models.food import FoodLog, FoodLogRead
from backend.models.user import User
from backend.models.workout import Workout, WorkoutRead


def get_dashboard_overview(user: User, db: Session) -> DashboardOverview:
    """Aggregate latest stats for the dashboard overview route."""

    workouts_q = (
        db.query(Workout)
        .filter(Workout.user_id == user.id)
        .order_by(Workout.created_at.desc())
    )
    meals_q = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == user.id)
        .order_by(FoodLog.created_at.desc())
    )

    workouts = workouts_q.all()
    meals = meals_q.all()

    total_workouts = len(workouts)
    total_meals = len(meals)
    total_calories_burned = sum(filter(None, (w.calories_burned for w in workouts)))
    average_calories_per_meal: float | None = None
    if meals:
        calorie_samples = [
            meal.total_calories for meal in meals if meal.total_calories is not None
        ]
        if calorie_samples:
            average_calories_per_meal = round(mean(calorie_samples), 2)

    latest_workout = workouts[0] if workouts else None
    latest_meal = meals[0] if meals else None

    summary = DashboardSummary(
        total_workouts=total_workouts,
        total_meals=total_meals,
        total_calories_burned=round(total_calories_burned, 2),
        average_calories_per_meal=average_calories_per_meal,
        last_workout_at=latest_workout.created_at if latest_workout else None,
        last_meal_logged_at=latest_meal.created_at if latest_meal else None,
        assistant_interactions=0,  # Placeholder until assistant logs are implemented
    )

    overview = DashboardOverview(
        summary=summary,
        latest_workout=WorkoutRead.model_validate(latest_workout).model_dump()
        if latest_workout
        else None,
        latest_meal=FoodLogRead.model_validate(latest_meal).model_dump()
        if latest_meal
        else None,
    )

    return overview









