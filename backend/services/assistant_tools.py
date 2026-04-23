"""LangChain StructuredTool definitions exposing HyperFit domain data.

Each tool reads the "currently active user" from
`assistant_context.get_active_user()` (thread-local) and queries the DB
via `session_scope()`. Tools return JSON-serialized strings because
LangChain requires string outputs.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

try:  # pragma: no cover - optional dependency guard
    from langchain_core.tools import StructuredTool
    _langchain_import_error: ImportError | None = None
except ImportError as exc:  # pragma: no cover
    StructuredTool = None  # type: ignore[assignment]
    _langchain_import_error = exc

if TYPE_CHECKING:  # pragma: no cover
    from langchain_core.tools import StructuredTool  # noqa: F401

from backend.core.database import session_scope
from backend.models.food import FoodLog
from backend.models.nutrition import DailyNutrition, NutritionCheckIn
from backend.models.workout import Workout
from backend.schemas.nutrition import CheckIn
from backend.services.assistant_context import get_active_user
from backend.services.nutrition_service import record_checkin


def tool_track_workout(_: str) -> str:
    """Retrieve the most recent workout for the authenticated user."""
    user = get_active_user()
    if not user:
        return "No authenticated user context available."

    try:
        with session_scope() as session:
            workout = (
                session.query(Workout)
                .filter(Workout.user_id == user.id)
                .order_by(Workout.created_at.desc())
                .first()
            )

            if not workout:
                return "No workout records found yet. Invite the user to upload a session."

            summary = {
                "workout_type": workout.workout_type,
                "duration_minutes": workout.duration_minutes,
                "calories_burned": workout.calories_burned,
                "ai_summary": workout.ai_summary,
                "exercises": [
                    {
                        "name": exercise.name,
                        "sets": exercise.sets,
                        "reps": exercise.reps,
                        "confidence": exercise.confidence,
                    }
                    for exercise in workout.exercises
                ],
            }
            return json.dumps(summary, default=str)
    except Exception as e:
        return f"Error retrieving workout data: {e!s}"


def tool_analyze_meal(_: str) -> str:
    """Retrieve the most recent meal analysis for the authenticated user."""
    user = get_active_user()
    if not user:
        return "No authenticated user context available."

    try:
        with session_scope() as session:
            log = (
                session.query(FoodLog)
                .filter(FoodLog.user_id == user.id)
                .order_by(FoodLog.created_at.desc())
                .first()
            )

            if not log:
                return "No food analysis records yet. Encourage the user to upload a meal photo."

            payload = {
                "total_calories": log.total_calories,
                "macronutrients": log.macronutrients,
                "food_items": log.food_items,
                "confidence_score": log.confidence_score,
            }
            return json.dumps(payload, default=str)
    except Exception as e:
        return f"Error retrieving meal data: {e!s}"


def tool_get_checkin_status(_: str) -> str:
    """Retrieve the latest check-in status for the authenticated user."""
    user = get_active_user()
    if not user:
        return "No authenticated user context available."

    try:
        with session_scope() as session:
            checkin = (
                session.query(NutritionCheckIn)
                .filter(NutritionCheckIn.user_id == user.id)
                .order_by(NutritionCheckIn.date.desc())
                .first()
            )
            daily = (
                session.query(DailyNutrition)
                .filter(DailyNutrition.user_id == user.id)
                .order_by(DailyNutrition.date.desc())
                .first()
            )

            if not checkin and not daily:
                return "No check-in records found yet. The user can start a check-in to set their nutrition goals."

            result: dict[str, Any] = {}
            if checkin:
                result.update(
                    {
                        "last_checkin_date": checkin.date.isoformat() if checkin.date else None,
                        "goal": checkin.goal,
                        "body_fat": checkin.body_fat,
                        "calories_previous": checkin.calories_previous,
                        "calories_new": checkin.calories_new,
                        "calories_change": checkin.calories_change,
                        "compliance": checkin.compliance,
                    }
                )
            if daily:
                result.update(
                    {
                        "current_calories_goal": daily.calories_goal,
                        "current_calories_consumed": daily.calories_consumed,
                        "current_weight": daily.weight,
                        "current_compliance": daily.compliance,
                    }
                )
            return json.dumps(result, default=str)
    except Exception as e:
        return f"Error retrieving check-in status: {e!s}"


def tool_submit_checkin(input_str: str) -> str:
    """Submit a nutrition check-in for the authenticated user."""
    user = get_active_user()
    if not user:
        return "No authenticated user context available."

    try:
        try:
            checkin_data = json.loads(input_str)
        except json.JSONDecodeError:
            return (
                "Invalid JSON format. Please provide a valid JSON string with goal, "
                "body_fat, calories_previous, calories_new, and optionally compliance."
            )

        required_fields = ["goal", "calories_previous", "calories_new"]
        missing_fields = [field for field in required_fields if field not in checkin_data]
        if missing_fields:
            return f"Missing required fields: {', '.join(missing_fields)}"

        with session_scope() as session:
            daily = (
                session.query(DailyNutrition)
                .filter(DailyNutrition.user_id == user.id)
                .order_by(DailyNutrition.date.desc())
                .first()
            )

            calories_previous = checkin_data.get("calories_previous")
            if not calories_previous and daily:
                calories_previous = daily.calories_goal
            elif not calories_previous:
                return "Could not determine previous calories. Please provide calories_previous."

            checkin_payload = CheckIn(
                user_id=user.id,
                goal=checkin_data["goal"],
                body_fat=checkin_data.get("body_fat", 15.0),
                calories_previous=float(calories_previous),
                calories_new=float(checkin_data["calories_new"]),
                compliance=checkin_data.get("compliance"),
            )

            result = record_checkin(checkin_payload, session)
            return json.dumps(
                {
                    "status": "success",
                    "message": (
                        f"Check-in erfolgreich durchgeführt! Neues Kalorienziel: "
                        f"{result.calories_new} kcal"
                    ),
                    "checkin": {
                        "id": result.id,
                        "date": result.date.isoformat() if result.date else None,
                        "goal": result.goal,
                        "calories_new": result.calories_new,
                        "calories_change": result.calories_change,
                    },
                },
                default=str,
            )
    except ValueError as e:
        return f"Validation error: {e!s}"
    except Exception as e:
        return f"Error submitting check-in: {e!s}"


def build_tools() -> list:
    """Return the list of StructuredTool instances for the assistant agent."""
    if _langchain_import_error is not None:
        raise _langchain_import_error

    return [
        StructuredTool.from_function(
            func=tool_track_workout,
            name="track_workout",
            description=(
                "ONLY use this tool when the user explicitly asks about their SPECIFIC workout data, "
                "reps, sets, or form feedback from a past workout. "
                "DO NOT use for general workout advice or questions."
            ),
        ),
        StructuredTool.from_function(
            func=tool_analyze_meal,
            name="analyze_meal",
            description=(
                "ONLY use this tool when the user asks about their SPECIFIC meal analysis data. "
                "DO NOT use for general nutrition advice or meal planning questions."
            ),
        ),
        StructuredTool.from_function(
            func=tool_get_checkin_status,
            name="get_checkin_status",
            description=(
                "ONLY use this tool when the user explicitly asks about their check-in status, "
                "calorie goals, or compliance numbers. "
                "DO NOT use for general nutrition or goal-setting questions."
            ),
        ),
        StructuredTool.from_function(
            func=tool_submit_checkin,
            name="submit_checkin",
            description=(
                "ONLY use this tool when the user explicitly wants to SUBMIT or CREATE a check-in. "
                "The input must be a JSON string with: goal (build/maintain/recomp/lose), "
                "body_fat (0-100), calories_previous (current goal), calories_new (new goal), "
                "and optionally compliance (0-100)."
            ),
        ),
    ]
