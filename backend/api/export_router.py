"""Data export endpoints for GDPR compliance."""

import csv
import io
import zipfile
from datetime import date, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.activity import Activity
from backend.models.food import FoodLog
from backend.models.nutrition import DailyNutrition, Meal, NutritionCheckIn, WeightLog
from backend.models.user import User
from backend.models.workout import Workout

router = APIRouter()


def _serialize(value):
    """Convert non-JSON-serializable types to strings."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


@router.get("/json")
def export_json(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Export all user data as JSON."""

    uid = current_user.id

    food_logs = db.query(FoodLog).filter(FoodLog.user_id == uid).all()
    workouts = db.query(Workout).filter(Workout.user_id == uid).all()
    daily_nutrition = db.query(DailyNutrition).filter(DailyNutrition.user_id == uid).all()
    checkins = db.query(NutritionCheckIn).filter(NutritionCheckIn.user_id == uid).all()
    activities = db.query(Activity).filter(Activity.user_id == uid).all()
    meals = db.query(Meal).filter(Meal.user_id == uid).all()
    weight_logs = db.query(WeightLog).filter(WeightLog.user_id == uid).all()

    def _row_to_dict(obj, exclude=("user",)):
        d = {}
        for col in obj.__table__.columns:
            if col.name not in exclude:
                d[col.name] = _serialize(getattr(obj, col.name))
        return d

    workout_data = []
    for w in workouts:
        wd = _row_to_dict(w)
        wd["exercises"] = [_row_to_dict(e) for e in w.exercises]
        workout_data.append(wd)

    data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "birth_date": _serialize(current_user.birth_date),
            "height_cm": current_user.height_cm,
            "weight_kg": current_user.weight_kg,
            "gender": current_user.gender,
            "activity_level": current_user.activity_level,
            "created_at": _serialize(current_user.created_at),
        },
        "food_logs": [_row_to_dict(f) for f in food_logs],
        "workouts": workout_data,
        "daily_nutrition": [_row_to_dict(d) for d in daily_nutrition],
        "nutrition_checkins": [_row_to_dict(c) for c in checkins],
        "activities": [_row_to_dict(a) for a in activities],
        "meals": [_row_to_dict(m) for m in meals],
        "weight_logs": [_row_to_dict(w) for w in weight_logs],
    }

    return JSONResponse(content=data)


@router.get("/csv")
def export_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Export meals, workouts, and exercises as a CSV zip file."""

    uid = current_user.id

    meals = db.query(Meal).filter(Meal.user_id == uid).all()
    workouts = db.query(Workout).filter(Workout.user_id == uid).all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # meals.csv
        meal_csv = io.StringIO()
        writer = csv.writer(meal_csv)
        writer.writerow(["id", "date", "note", "calories", "protein", "carbs", "fat", "created_at"])
        for m in meals:
            writer.writerow([m.id, m.date, m.note, m.calories, m.protein, m.carbs, m.fat, m.created_at])
        zf.writestr("meals.csv", meal_csv.getvalue())

        # workouts.csv
        w_csv = io.StringIO()
        writer = csv.writer(w_csv)
        writer.writerow(["id", "name", "workout_type", "duration_minutes", "calories_burned", "intensity_level", "created_at"])
        for w in workouts:
            writer.writerow([w.id, w.name, w.workout_type, w.duration_minutes, w.calories_burned, w.intensity_level, w.created_at])
        zf.writestr("workouts.csv", w_csv.getvalue())

        # exercises.csv
        e_csv = io.StringIO()
        writer = csv.writer(e_csv)
        writer.writerow(["id", "workout_id", "name", "sets", "reps", "weight_kg", "duration_seconds", "form_score"])
        for w in workouts:
            for e in w.exercises:
                writer.writerow([e.id, e.workout_id, e.name, e.sets, e.reps, e.weight_kg, e.duration_seconds, e.form_score])
        zf.writestr("exercises.csv", e_csv.getvalue())

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=hyperfit_export_{current_user.id}.zip"},
    )
