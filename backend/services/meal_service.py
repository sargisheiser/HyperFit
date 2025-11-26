"""Meal analysis service integrating OpenAI vision."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple

from fastapi import UploadFile

from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.food import FoodAnalysisResult, FoodLog
from backend.models.user import User
from ai_modules.food_recognition.openai_service import (
    FoodRecognitionService,
    get_food_recognition_service,
)


FOOD_UPLOAD_DIR = Path(settings.upload_dir) / "food"
FOOD_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _store_image(file: UploadFile) -> Path:
    """Persist uploaded image and return filesystem path."""

    suffix = Path(file.filename or "meal.jpg").suffix or ".jpg"
    destination = FOOD_UPLOAD_DIR / f"meal-{uuid.uuid4().hex}{suffix}"
    file.file.seek(0)
    destination.write_bytes(file.file.read())
    return destination


async def analyze_meal_image(
    image: UploadFile,
    user: Optional[User],
    user_context: Optional[Dict[str, str]] = None,
) -> Tuple[FoodLog, FoodAnalysisResult]:
    """Analyze a meal image, persist the nutrition log, and return rich results."""

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


def create_manual_meal(
    user: User,
    food_items: list,
    total_calories: Optional[float] = None,
    macronutrients: Optional[Dict[str, Any]] = None,
    note: Optional[str] = None,
) -> FoodLog:
    """Create a manual meal entry without image analysis."""
    import json
    
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
    food_items: Optional[list] = None,
    total_calories: Optional[float] = None,
    macronutrients: Optional[Dict[str, Any]] = None,
    note: Optional[str] = None,
) -> FoodLog:
    """Correct an existing meal analysis."""
    import json
    
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









