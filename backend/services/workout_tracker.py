"""Service layer for workout analysis and persistence."""

from __future__ import annotations

import math
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple

from fastapi import UploadFile

from ai_modules.workout_tracking.mediapipe_service import (
    WorkoutRecognitionService,
    get_workout_recognition_service,
)
from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.user import User
from backend.models.workout import Exercise, Workout, WorkoutAnalysisResult


WORKOUT_UPLOAD_DIR = Path(settings.upload_dir) / "workouts"
WORKOUT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _store_video_file(file: UploadFile) -> Path:
    suffix = Path(file.filename or "workout.mp4").suffix or ".mp4"
    destination = WORKOUT_UPLOAD_DIR / f"workout-{uuid.uuid4().hex}{suffix}"
    file.file.seek(0)
    destination.write_bytes(file.file.read())
    return destination


async def analyze_workout(
    file: UploadFile,
    user: User,
    workout_type: Optional[str] = None,
) -> Tuple[Workout, WorkoutAnalysisResult, Dict[str, str]]:
    """Store the uploaded video, run MediaPipe analysis, and persist the workout."""

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

        session.refresh(workout)

    metadata = {
        "video_path": str(saved_path),
        "filename": Path(saved_path).name,
    }

    return workout, analysis, metadata

