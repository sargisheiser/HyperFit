"""
Regression tests for Pydantic model configuration to guard against
deprecated settings and ensure from_attributes behavior.
"""

from datetime import datetime, timezone
from types import SimpleNamespace

from backend.models.food import FoodAnalysisResult, FoodItem, Macronutrients
from backend.models.workout import ExerciseRead, WorkoutRead


def test_exercise_read_from_attributes():
    """ExerciseRead should accept attribute-style objects via ConfigDict."""

    source = SimpleNamespace(
        id=1,
        name="Push-Up",
        sets=3,
        reps=12,
        weight_kg=None,
        duration_seconds=180,
        form_score=0.85,
        confidence=0.9,
    )

    exercise = ExerciseRead.model_validate(source)

    assert exercise.name == "Push-Up"
    assert exercise.reps == 12
    assert exercise.form_score == 0.85
    assert exercise.confidence == 0.9


def test_workout_read_from_attributes():
    """WorkoutRead should hydrate nested exercises via attribute access."""

    exercise = ExerciseRead(
        id=2,
        name="Squat",
        sets=4,
        reps=10,
        weight_kg=60.0,
        duration_seconds=240,
        form_score=0.9,
        confidence=0.95,
    )

    workout_source = SimpleNamespace(
        id=5,
        user_id=42,
        name="Leg Day",
        workout_type="Strength",
        duration_minutes=45,
        intensity_level="high",
        calories_burned=550.0,
        ai_summary="Strong depth with minor knee valgus.",
        ai_metadata={"model": "mediapipe-v2"},
        video_path="uploads/workouts/sample.mp4",
        created_at=datetime.now(timezone.utc),
        updated_at=None,
        exercises=[exercise],
    )

    workout = WorkoutRead.model_validate(workout_source)

    assert workout.user_id == 42
    assert workout.exercises[0].name == "Squat"
    assert workout.ai_metadata["model"] == "mediapipe-v2"


def test_food_analysis_result_serialization_round_trip():
    """FoodAnalysisResult should serialize optional macro fields without warnings."""

    result = FoodAnalysisResult(
        food_items=[
            FoodItem(name="Grilled Salmon", quantity="180g", confidence=0.92),
        ],
        total_calories=450.0,
        macronutrients=Macronutrients(
            protein_grams=40.0,
            carbs_grams=5.0,
            fat_grams=30.0,
            fiber_grams=2.5,
            sugar_grams=1.0,
        ),
        confidence_score=0.88,
        analysis_details={"meal_type": "dinner"},
        model_used="gemini-2.5-flash",
    )

    payload = result.model_dump()

    assert payload["macronutrients"]["fiber_grams"] == 2.5
    assert payload["model_used"] == "gemini-2.5-flash"

