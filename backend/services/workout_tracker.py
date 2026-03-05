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


ALLOWED_VIDEO_MIME_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/webm", "video/x-matroska",
}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}


def _validate_video_file(file: UploadFile) -> None:
    """Validate MIME type and extension of uploaded video files."""
    # Check extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix and suffix not in ALLOWED_VIDEO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        raise ValueError(f"File type '{suffix}' not allowed. Allowed: {allowed}")

    # Check content type header
    content_type = (file.content_type or "").lower()
    if content_type and content_type != "application/octet-stream":
        if content_type not in ALLOWED_VIDEO_MIME_TYPES:
            allowed = ", ".join(sorted(ALLOWED_VIDEO_MIME_TYPES))
            raise ValueError(f"MIME type '{content_type}' not allowed. Allowed: {allowed}")

    # Magic bytes check for common video formats
    file.file.seek(0)
    header = file.file.read(12)
    file.file.seek(0)

    if len(header) >= 8:
        # MP4/MOV: check for ftyp box
        if header[4:8] == b"ftyp":
            return
        # WebM/MKV: check for EBML header
        if header[:4] == b"\x1a\x45\xdf\xa3":
            return
        # AVI: check for RIFF....AVI
        if header[:4] == b"RIFF" and header[8:12] == b"AVI ":
            return

    # If we can't verify magic bytes, allow if extension/MIME was valid
    if suffix in ALLOWED_VIDEO_EXTENSIONS or content_type in ALLOWED_VIDEO_MIME_TYPES:
        return

    raise ValueError("Could not verify file as a valid video format.")


def _store_video_file(file: UploadFile) -> Path:
    _validate_video_file(file)
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

