"""Service layer for meal analysis using OpenAI Vision."""

import json
import uuid
from pathlib import Path

from ai_modules.food_recognition.openai_service import (
    FoodRecognitionService,
    get_food_recognition_service,
)
from fastapi import UploadFile

from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.food import FoodAnalysisResult, FoodLog
from backend.models.user import User

FOOD_UPLOAD_DIR = Path(settings.upload_dir) / "food"
FOOD_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _store_image(file: UploadFile) -> Path:
    suffix = Path(file.filename or "meal.jpg").suffix or ".jpg"
    destination = FOOD_UPLOAD_DIR / f"meal-{uuid.uuid4().hex}{suffix}"
    file.file.seek(0)
    destination.write_bytes(file.file.read())
    return destination


async def analyze_food(
    image: UploadFile,
    user: User | None,
    user_context: dict[str, str] | None = None,
) -> tuple[FoodLog, FoodAnalysisResult]:
    """Analyze the uploaded food image with OpenAI GPT-V and persist the nutrition log."""

    service: FoodRecognitionService = get_food_recognition_service()
    saved_path = _store_image(image)

    analysis_raw = await service.analyze_food_image(
        str(saved_path), user_context=user_context
    )
    analysis = FoodAnalysisResult(**analysis_raw)

    with session_scope() as session:
        log = FoodLog(
            user_id=user.id if user else None,
            image_path=str(saved_path),
            total_calories=analysis.total_calories,
            macronutrients=json.loads(analysis.macronutrients.model_dump_json()),
            food_items=[item.model_dump() for item in analysis.food_items],
            confidence_score=analysis.confidence_score,
            raw_response=analysis.model_dump(),
        )
        session.add(log)
        session.flush()
        session.refresh(log)

    return log, analysis

