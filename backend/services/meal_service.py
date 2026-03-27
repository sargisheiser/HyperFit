"""Meal analysis service integrating OpenAI vision."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai_modules.food_recognition.openai_service import (
    FoodRecognitionService,
    get_food_recognition_service,
)
from fastapi import HTTPException, UploadFile, status

from backend.core.config import settings
from backend.core.database import session_scope
from backend.core.sanitization import sanitize_string
from backend.models.food import FoodAnalysisResult, FoodLog
from backend.models.user import User

FOOD_UPLOAD_DIR = Path(settings.upload_dir) / "food"
FOOD_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed MIME types for images
ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

# Allowed file extensions for images
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _validate_upload_file(
    file: UploadFile,
    max_size: int | None = None,
    allowed_extensions: list[str] | None = None,
    allowed_mime_types: list[str] | None = None,
) -> None:
    """
    Validate uploaded file for security and format requirements.

    Args:
        file: The uploaded file
        max_size: Maximum file size in bytes (defaults to settings.max_file_size)
        allowed_extensions: List of allowed file extensions (defaults to image extensions)
        allowed_mime_types: List of allowed MIME types (defaults to image MIME types)

    Raises:
        HTTPException: If validation fails
    """
    # Set defaults
    max_size = max_size or settings.max_file_size
    allowed_extensions = allowed_extensions or list(ALLOWED_IMAGE_EXTENSIONS)
    allowed_mime_types = allowed_mime_types or list(ALLOWED_IMAGE_MIME_TYPES)

    # Check filename exists
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a filename"
        )

    # Sanitize filename - prevent path traversal
    filename = Path(file.filename).name  # Get only the filename, not the path
    if filename != file.filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal not allowed"
        )

    # Check file extension
    file_ext = Path(filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed extensions: {', '.join(allowed_extensions)}"
        )

    # Check MIME type
    if file.content_type and file.content_type.lower() not in [m.lower() for m in allowed_mime_types]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File MIME type not allowed. Allowed types: {', '.join(allowed_mime_types)}"
        )

    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > max_size:
        max_size_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size_mb:.1f}MB"
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )


def _store_image(file: UploadFile, user: User | None = None) -> Path:
    """
    Persist uploaded image and return filesystem path.
    Uses enhanced file validation from file_validation module.
    """
    # Use enhanced validation (includes PIL verification, MIME type validation, etc.)
    user_id = user.id if user else None

    # Validate file (includes size, extension, MIME type, PIL verification)
    from backend.core.file_validation import (
        generate_secure_filename,
        validate_file_extension,
        validate_file_size,
        validate_image_content,
        validate_upload_path,
    )

    validate_file_size(file)
    validate_file_extension(file.filename or "image.jpg")
    mime_type, validated_ext = validate_image_content(file)

    # Generate secure filename
    secure_filename = generate_secure_filename(file.filename or "image.jpg", user_id)
    secure_filename = Path(secure_filename).stem + validated_ext

    # Use food subdirectory to match existing structure
    upload_subdir = Path(settings.upload_dir) / "food"
    storage_path = validate_upload_path(str(upload_subdir), secure_filename)

    # Ensure upload directory exists
    storage_path.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    file.file.seek(0)
    storage_path.write_bytes(file.file.read())

    return storage_path


async def analyze_meal_image(
    image: UploadFile,
    user: User | None,
    user_context: dict[str, str] | None = None,
) -> tuple[FoodLog, FoodAnalysisResult]:
    """Analyze a meal image, persist the nutrition log, and return rich results."""

    service: FoodRecognitionService = get_food_recognition_service()
    saved_path = _store_image(image, user)

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


def create_manual_meal(
    user: User,
    food_items: list[dict[str, Any]],
    total_calories: float | None = None,
    macronutrients: dict[str, Any] | None = None,
    note: str | None = None,
) -> FoodLog:
    """Create a manual meal entry without image analysis."""

    # Sanitize user-provided text fields
    note = sanitize_string(note)

    # Sanitize food item names
    for item in food_items:
        if 'name' in item:
            item['name'] = sanitize_string(item['name'])

    # Calculate totals from food items if not provided
    if not total_calories or not macronutrients:
        calculated_calories = 0
        calculated_protein = 0
        calculated_carbs = 0
        calculated_fat = 0

        for item in food_items:
            item_calories = item.get('calories') or item.get('calories_per_100g', 0)
            item_protein = item.get('protein_grams') or item.get('protein_per_100g', 0)
            item_carbs = item.get('carbs_grams') or item.get('carbs_per_100g', 0)
            item_fat = item.get('fat_grams') or item.get('fat_per_100g', 0)

            # Handle quantity/portion size
            quantity = item.get('quantity', '100g')
            multiplier = 1.0
            if isinstance(quantity, str) and 'g' in quantity.lower():
                try:
                    grams = float(quantity.lower().replace('g', '').strip())
                    multiplier = grams / 100.0
                except (ValueError, AttributeError):
                    multiplier = 1.0

            calculated_calories += item_calories * multiplier
            calculated_protein += item_protein * multiplier
            calculated_carbs += item_carbs * multiplier
            calculated_fat += item_fat * multiplier

        if not total_calories:
            total_calories = calculated_calories
        if not macronutrients:
            macronutrients = {
                'protein_grams': calculated_protein,
                'carbs_grams': calculated_carbs,
                'fat_grams': calculated_fat,
            }

    with session_scope() as session:
        log = FoodLog(
            user_id=user.id,
            image_path=None,  # No image for manual entries
            total_calories=total_calories,
            macronutrients=macronutrients or {},
            food_items=food_items,
            confidence_score=1.0,  # Manual entries have 100% confidence
            raw_response={'source': 'manual', 'food_items': food_items},
            is_manual=1,
            is_corrected=0,
            note=note,
        )
        session.add(log)
        session.flush()
        session.refresh(log)

    return log


def correct_meal_analysis(
    food_log_id: int,
    user: User,
    food_items: list[dict[str, Any]] | None = None,
    total_calories: float | None = None,
    macronutrients: dict[str, Any] | None = None,
    note: str | None = None,
) -> FoodLog:
    """Correct an existing meal analysis."""

    # Sanitize user-provided text fields
    note = sanitize_string(note) if note is not None else None

    # Sanitize food item names
    if food_items:
        for item in food_items:
            if 'name' in item:
                item['name'] = sanitize_string(item['name'])

    with session_scope() as session:
        log = session.query(FoodLog).filter(
            FoodLog.id == food_log_id,
            FoodLog.user_id == user.id
        ).first()

        if not log:
            raise ValueError(f"Food log {food_log_id} not found for user {user.id}")

        # Update fields if provided
        if food_items is not None:
            log.food_items = food_items

        if total_calories is not None:
            log.total_calories = total_calories

        if macronutrients is not None:
            log.macronutrients = macronutrients

        if note is not None:
            log.note = note

        # Mark as corrected
        log.is_corrected = 1

        # Recalculate if food_items changed
        if food_items is not None and (total_calories is None or macronutrients is None):
            calculated_calories = 0
            calculated_protein = 0
            calculated_carbs = 0
            calculated_fat = 0

            for item in food_items:
                item_calories = item.get('calories') or item.get('calories_per_100g', 0)
                item_protein = item.get('protein_grams') or item.get('protein_per_100g', 0)
                item_carbs = item.get('carbs_grams') or item.get('carbs_per_100g', 0)
                item_fat = item.get('fat_grams') or item.get('fat_per_100g', 0)

                quantity = item.get('quantity', '100g')
                multiplier = 1.0
                if isinstance(quantity, str) and 'g' in quantity.lower():
                    try:
                        grams = float(quantity.lower().replace('g', '').strip())
                        multiplier = grams / 100.0
                    except (ValueError, AttributeError):
                        multiplier = 1.0

                calculated_calories += item_calories * multiplier
                calculated_protein += item_protein * multiplier
                calculated_carbs += item_carbs * multiplier
                calculated_fat += item_fat * multiplier

            if total_calories is None:
                log.total_calories = calculated_calories
            if macronutrients is None:
                log.macronutrients = {
                    'protein_grams': calculated_protein,
                    'carbs_grams': calculated_carbs,
                    'fat_grams': calculated_fat,
                }

        session.flush()
        session.refresh(log)

    return log









