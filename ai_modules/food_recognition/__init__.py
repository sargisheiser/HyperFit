# Meal analysis AI module exports
from ai_modules.food_recognition.gemini_service import (
    GeminiFoodRecognitionService,
    get_food_recognition_service,
)

__all__ = [
    "GeminiFoodRecognitionService",
    "get_food_recognition_service",
]
