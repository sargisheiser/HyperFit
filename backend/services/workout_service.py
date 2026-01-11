"\"\"\"Workout analysis and real-time tracking service layer.\"\"\""

from __future__ import annotations

import math
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple

from fastapi import UploadFile

from datetime import date

from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.activity import Activity
from backend.models.user import User
from backend.models.workout import Exercise, Workout, WorkoutAnalysisResult, WorkoutHistoryCreate
from ai_modules.workout_tracking.mediapipe_service import (
    WorkoutRecognitionService,
    get_workout_recognition_service,
)


WORKOUT_UPLOAD_DIR = Path(settings.upload_dir) / "workouts"
WORKOUT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _add_calories_to_activity(session, user_id: int, calories_burned: Optional[float], workout_date: Optional[date] = None) -> None:
    """Add workout calories to the user's daily activity record."""
    # Accept any positive value, including small values like 2 calories
    if calories_burned is None or calories_burned < 0:
        return
    
    if workout_date is None:
        workout_date = date.today()
    
    # Get or create today's activity
    activity = session.query(Activity).filter(
        Activity.user_id == user_id,
        Activity.date == workout_date,
    ).first()
    
    if activity:
        activity.calories_burned += calories_burned
    else:
        activity = Activity(
            user_id=user_id,
            date=workout_date,
            steps=0,
            calories_burned=calories_burned,
            distance_km=0.0,
        )
        session.add(activity)


def _store_video_file(file: UploadFile) -> Path:
    """Persist uploaded workout video and return filesystem path."""
    from backend.services.meal_service import _validate_upload_file
    
    # Validate video file
    allowed_video_extensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"]
    allowed_video_mime_types = [
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
        "video/x-matroska",
    ]
    # Videos can be larger, use 100MB as max
    max_video_size = 100 * 1024 * 1024
    
    _validate_upload_file(
        file,
        max_size=max_video_size,
        allowed_extensions=allowed_video_extensions,
        allowed_mime_types=allowed_video_mime_types,
    )
    
    # Get safe filename
    filename = Path(file.filename or "workout.mp4").name
    suffix = Path(filename).suffix or ".mp4"
    
    # Generate unique filename to prevent conflicts and path traversal
    destination = WORKOUT_UPLOAD_DIR / f"workout-{uuid.uuid4().hex}{suffix}"
    
    # Write file
    file.file.seek(0)
    destination.write_bytes(file.file.read())
    return destination


async def analyze_workout_video(
    file: UploadFile,
    user: User,
    workout_type: Optional[str] = None,
) -> Tuple[Workout, WorkoutAnalysisResult, Dict[str, str]]:
    """Store the uploaded video, run AI analysis, and persist the workout."""

    workout_service: WorkoutRecognitionService = get_workout_recognition_service()
    saved_path = _store_video_file(file)

    analysis_raw = await workout_service.analyze_workout_video(
        str(saved_path), workout_type=workout_type
    )
    analysis = WorkoutAnalysisResult(**analysis_raw)

    with session_scope() as session:
        duration_minutes = (
            math.ceil(analysis.video_duration / 60) if analysis.video_duration else None
        )
        workout = Workout(
            user_id=user.id,
            name=workout_type or "AI Guided Session",
            workout_type=workout_type,
            duration_minutes=duration_minutes,
            calories_burned=analysis.estimated_calories,
            ai_summary=analysis.form_analysis.get("recommendations", [""])[0]
            if analysis.form_analysis
            else None,
            ai_metadata=analysis.model_dump(),
            video_path=str(saved_path),
        )
        session.add(workout)
        session.flush()

        for item in analysis.detected_exercises:
            exercise = Exercise(
                workout_id=workout.id,
                name=item.get("name", "exercise"),
                sets=item.get("sets"),
                reps=item.get("reps"),
                duration_seconds=item.get("duration_seconds"),
                confidence=item.get("confidence"),
            )
            session.add(exercise)

        # Add calories to activity record before committing
        # Use today's date since the workout is being created now
        if workout.calories_burned is not None and workout.calories_burned >= 0:
            workout_date = date.today()
            _add_calories_to_activity(session, user.id, workout.calories_burned, workout_date)

        session.commit()
        session.refresh(workout)

    metadata = {
        "video_path": str(saved_path),
        "filename": Path(saved_path).name,
    }

    return workout, analysis, metadata


def create_workout_history_entry(user: User, payload: WorkoutHistoryCreate) -> Workout:
    """Persist a manually logged workout session."""

    duration_minutes: Optional[int] = None
    if payload.duration_seconds is not None:
        duration_minutes = max(1, math.ceil(payload.duration_seconds / 60)) if payload.duration_seconds > 0 else 0

    with session_scope() as session:
        workout = Workout(
            user_id=user.id,
            name=payload.name or payload.exercise or "Manual Session",
            workout_type=payload.workout_type or payload.exercise,
            duration_minutes=duration_minutes,
            calories_burned=payload.calories_burned,
            ai_summary="\n".join(payload.feedback) if payload.feedback else None,
            ai_metadata={
                "source": "manual-log",
                "exercise": payload.exercise,
                "reps": payload.reps,
                "duration_seconds": payload.duration_seconds,
                "feedback": payload.feedback,
                "notes": payload.notes,
            },
        )
        session.add(workout)
        session.flush()

        if payload.exercise or payload.reps is not None:
            exercise_entry = Exercise(
                workout_id=workout.id,
                name=payload.exercise or payload.name or "exercise",
                reps=payload.reps,
                duration_seconds=payload.duration_seconds,
            )
            session.add(exercise_entry)

        # Add calories to activity record before committing
        # Use today's date since the workout is being created now
        if workout.calories_burned is not None and workout.calories_burned >= 0:
            workout_date = date.today()
            _add_calories_to_activity(session, user.id, workout.calories_burned, workout_date)

        session.commit()
        session.refresh(workout)

    return workout





