"""Activity tracking endpoints for steps, calories burned, and distance."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.activity import Activity
from backend.models.nutrition import DailyNutrition
from backend.models.user import User

router = APIRouter()


@router.get("/")
def get_activity_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
    target_date: date | None = Query(None, alias="date"),
) -> dict:
    """Get activity stats (steps, calories burned, distance) for today or specified date."""
    if target_date is None:
        target_date = date.today()

    activity = db.query(Activity).filter(
        Activity.user_id == current_user.id,
        Activity.date == target_date,
    ).first()

    if activity:
        return {
            "steps": activity.steps,
            "calories_burned": round(activity.calories_burned, 1),
            "distance_km": round(activity.distance_km, 2),
            "date": target_date.isoformat(),
        }

    # Return defaults if no activity found
    return {
        "steps": 0,
        "calories_burned": 0.0,
        "distance_km": 0.0,
        "date": target_date.isoformat(),
    }


@router.post("/steps")
def add_steps(
    steps: int = Query(..., ge=0, description="Number of steps to add"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict:
    """Add steps to today's activity. Automatically calculates calories burned and distance."""
    today = date.today()

    # Get or create today's activity
    activity = db.query(Activity).filter(
        Activity.user_id == current_user.id,
        Activity.date == today,
    ).first()

    if activity:
        activity.steps += steps
    else:
        activity = Activity(
            user_id=current_user.id,
            date=today,
            steps=steps,
        )
        db.add(activity)

    # Calories per step scaled by body weight (heavier person burns more per step)
    # Formula: ~0.0005 * weight_kg per step. Fallback to 0.04 (~80kg person) if no weight.
    weight = current_user.weight_kg or 80.0
    calories_per_step = 0.0005 * weight
    activity.calories_burned += steps * calories_per_step

    # Distance estimate: ~0.0008 km per step (~1250 steps per km)
    km_per_step = 0.0008
    activity.distance_km += steps * km_per_step

    db.commit()
    db.refresh(activity)

    return {
        "status": "success",
        "steps": activity.steps,
        "calories_burned": round(activity.calories_burned, 1),
        "distance_km": round(activity.distance_km, 2),
        "date": today.isoformat(),
    }


@router.get("/calorie-balance")
def get_calorie_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
    target_date: date | None = Query(None, alias="date"),
) -> dict:
    """Get calorie balance (calories in, calories out, net calories) for today or specified date."""
    if target_date is None:
        target_date = date.today()

    # Get calories consumed from nutrition
    daily_nutrition = db.query(DailyNutrition).filter(
        DailyNutrition.user_id == current_user.id,
        DailyNutrition.date == target_date,
    ).first()

    calories_in = daily_nutrition.calories_consumed if daily_nutrition else 0.0

    # Get calories burned from activity
    activity = db.query(Activity).filter(
        Activity.user_id == current_user.id,
        Activity.date == target_date,
    ).first()

    calories_out = activity.calories_burned if activity else 0.0
    steps = activity.steps if activity else 0

    # Calculate net calories
    net_calories = calories_in - calories_out

    return {
        "calories_in": round(calories_in, 1),
        "calories_out": round(calories_out, 1),
        "net_calories": round(net_calories, 1),
        "steps": steps,
        "date": target_date.isoformat(),
    }

