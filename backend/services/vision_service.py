"""Service helpers for AI-driven meal vision analysis."""

from __future__ import annotations

import asyncio
import base64
import logging
import random
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from fastapi import UploadFile

from backend.core.config import settings
from backend.schemas.vision import VisionResponse

try:
    from ai_modules.food_recognition.openai_service import (
        FoodRecognitionService as OpenAIFoodRecognitionService,
        get_food_recognition_service as get_openai_food_recognition_service,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    OpenAIFoodRecognitionService = None  # type: ignore
    get_openai_food_recognition_service = None  # type: ignore

try:
    from ai_modules.food_recognition.gemini_service import (
        GeminiFoodRecognitionService,
        get_food_recognition_service as get_gemini_food_recognition_service,
    )
except ImportError:  # pragma: no cover - handled gracefully at runtime
    GeminiFoodRecognitionService = None  # type: ignore
    get_gemini_food_recognition_service = None  # type: ignore

logger = logging.getLogger(__name__)
if settings.vision_log_level:
    logger.setLevel(getattr(logging, settings.vision_log_level.upper(), logging.INFO))


VISION_UPLOAD_DIR = Path(settings.upload_dir) / "vision"
VISION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


DEFAULT_MOCK_ANALYSES: List[Dict[str, Any]] = [
    {
        "label": "Power Bowl",
        "calories": 540.0,
        "protein": 42.0,
        "carbs": 48.0,
        "fat": 18.0,
        "food_items": [
            {"name": "Grilled chicken breast", "quantity": "180 g", "confidence": 0.9},
            {"name": "Quinoa", "quantity": "120 g", "confidence": 0.75},
            {"name": "Roasted veggies", "quantity": "1 cup", "confidence": 0.6},
        ],
        "insights": [
            "High-protein recovery meal",
            "Balanced complex carbs for sustained energy",
        ],
        "recommendations": ["Add leafy greens for extra micronutrients"],
    },
    {
        "label": "Mediterranean Plate",
        "calories": 610.0,
        "protein": 32.0,
        "carbs": 55.0,
        "fat": 24.0,
        "food_items": [
            {"name": "Salmon fillet", "quantity": "160 g", "confidence": 0.82},
            {"name": "Couscous", "quantity": "100 g", "confidence": 0.7},
            {"name": "Greek salad", "quantity": "1 bowl", "confidence": 0.55},
        ],
        "insights": [
            "Rich in omega-3 fats for recovery",
            "Mediterranean style meal",
        ],
        "recommendations": ["Pair with lemon water to support digestion"],
    },
    {
        "label": "Performance Breakfast",
        "calories": 460.0,
        "protein": 28.0,
        "carbs": 52.0,
        "fat": 14.0,
        "food_items": [
            {"name": "Overnight oats", "quantity": "1 jar", "confidence": 0.65},
            {"name": "Greek yogurt", "quantity": "120 g", "confidence": 0.7},
            {"name": "Mixed berries", "quantity": "80 g", "confidence": 0.6},
        ],
        "insights": [
            "Great pre-training option",
            "Steady energy release from complex carbs",
        ],
        "recommendations": ["Add chia seeds for extra fiber"],
    },
]


def _coerce_float(value: Any, default: Optional[float] = 0.0) -> Optional[float]:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_food_items(items: Any) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    if not isinstance(items, list):
        return normalized
    for entry in items:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        if not name:
            continue
        normalized.append(
            {
                "name": str(name),
                "quantity": entry.get("quantity") or entry.get("portion"),
                "confidence": _coerce_float(entry.get("confidence"), default=None)
                if entry.get("confidence") is not None
                else None,
            }
        )
    return normalized


def _insights_from_analysis(analysis: Dict[str, Any]) -> List[str]:
    details = analysis.get("analysis_details")
    insights: List[str] = []
    if isinstance(details, dict):
        for key in ("meal_type", "cuisine", "cooking_method", "notes"):
            value = details.get(key)
            if value:
                label = key.replace("_", " ").title()
                insights.append(f"{label}: {value}")
    raw_insights = analysis.get("insights")
    if isinstance(raw_insights, list):
        for entry in raw_insights:
            if isinstance(entry, str):
                insights.append(entry)
    return insights


def _generate_mock_analysis(note: Optional[str]) -> Dict[str, Any]:
    sample = random.choice(DEFAULT_MOCK_ANALYSES)
    description = note or sample.get("label") or "Meal"
    return {
        "calories": sample["calories"],
        "protein": sample["protein"],
        "carbs": sample["carbs"],
        "fat": sample["fat"],
        "food_items": _normalize_food_items(sample["food_items"]),
        "confidence_score": 0.55,
        "insights": sample.get("insights", []),
        "recommendations": sample.get("recommendations", []),
        "source": "mock",
        "note": description,
    }


def _normalize_analysis_payload(
    payload: Dict[str, Any],
    *,
    note: Optional[str],
    provider: Optional[str],
) -> Dict[str, Any]:
    calories = payload.get("calories")
    if calories is None:
        calories = payload.get("total_calories")
    macros = payload.get("macronutrients", {})
    return {
        "calories": _coerce_float(calories),
        "protein": _coerce_float(
            payload.get("protein")
            if payload.get("protein") is not None
            else macros.get("protein_grams"),
        ),
        "carbs": _coerce_float(
            payload.get("carbs")
            if payload.get("carbs") is not None
            else macros.get("carbs_grams"),
        ),
        "fat": _coerce_float(
            payload.get("fat")
            if payload.get("fat") is not None
            else macros.get("fat_grams"),
        ),
        "food_items": _normalize_food_items(payload.get("food_items")),
        "confidence_score": payload.get("confidence_score"),
        "insights": payload.get("insights") or _insights_from_analysis(payload),
        "recommendations": payload.get("recommendations") or [],
        "source": provider or payload.get("source") or "vision",
        "note": note or payload.get("note"),
    }


def _make_filename(suffix: str) -> Path:
    return VISION_UPLOAD_DIR / f"meal_{uuid.uuid4().hex}{suffix}"


def _store_upload(upload: UploadFile) -> Path:
    """Store uploaded image with validation."""
    from backend.services.meal_service import _validate_upload_file
    
    # Validate image file
    _validate_upload_file(upload)
    
    # Get safe filename
    filename = Path(upload.filename or "image.jpg").name
    suffix = Path(filename).suffix.lower() or ".jpg"
    destination = _make_filename(suffix)
    
    # Write file
    upload.file.seek(0)
    destination.write_bytes(upload.file.read())
    return destination


def _decode_base64_image(data: str) -> bytes:
    pattern = r"^data:(?:image/[\w.+-]+);base64,(.*)$"
    match = re.match(pattern, data)
    payload = match.group(1) if match else data
    return base64.b64decode(payload)


def _store_base64_image(data: str) -> Path:
    destination = _make_filename(".jpg")
    destination.write_bytes(_decode_base64_image(data))
    return destination


def _relative_url(path: Path) -> str:
    uploads_root = Path(settings.upload_dir)
    try:
        relative = path.relative_to(uploads_root)
    except ValueError:
        relative = path.name
    return f"/uploads/{relative.as_posix()}"


async def analyze_meal_image(
    *,
    upload: Optional[UploadFile] = None,
    image_base64: Optional[str] = None,
    note: Optional[str] = None,
) -> VisionResponse:
    if not upload and not image_base64:
        raise ValueError("An image upload or base64 string is required.")

    saved_path = _store_upload(upload) if upload else _store_base64_image(image_base64 or "")
    logger.debug("Vision upload stored at %s", saved_path)

    analysis_payload: Optional[Dict[str, Any]] = None

    if settings.vision_mock_mode:
        logger.info("Vision mock mode enabled; returning synthetic analysis.")
        analysis_payload = _generate_mock_analysis(note)
    else:
        provider_errors: List[str] = []

        async def _run_openai() -> Dict[str, Any]:
            if get_openai_food_recognition_service is None or OpenAIFoodRecognitionService is None:
                raise RuntimeError("OpenAI food recognition module unavailable.")
            service: OpenAIFoodRecognitionService = get_openai_food_recognition_service()
            logger.debug(
                "Invoking OpenAI food recognition with timeout=%ss (model=%s)",
                settings.vision_timeout_seconds,
                getattr(service, "model", "unknown"),
            )
            raw_payload = await asyncio.wait_for(
                service.analyze_food_image(str(saved_path)),
                timeout=settings.vision_timeout_seconds,
            )
            logger.debug("OpenAI vision raw payload: %s", raw_payload)
            normalized = _normalize_analysis_payload(raw_payload, note=note, provider="openai")
            logger.debug("OpenAI normalized payload: %s", normalized)
            return normalized

        async def _run_gemini() -> Dict[str, Any]:
            if get_gemini_food_recognition_service is None or GeminiFoodRecognitionService is None:
                raise RuntimeError("Gemini food recognition module unavailable.")
            service: GeminiFoodRecognitionService = get_gemini_food_recognition_service()
            logger.debug(
                "Invoking Gemini food recognition (model=%s)",
                getattr(service, "model", "unknown"),
            )
            raw_payload = await service.analyze_food_image(str(saved_path))
            logger.debug("Gemini vision raw payload: %s", raw_payload)
            normalized = _normalize_analysis_payload(raw_payload, note=note, provider="gemini")
            logger.debug("Gemini normalized payload: %s", normalized)
            return normalized

        provider_callables: Sequence[tuple[str, Any]] = ()
        openai_available = (
            get_openai_food_recognition_service is not None
            and OpenAIFoodRecognitionService is not None
            and bool(settings.openai_api_key)
        )
        gemini_available = (
            get_gemini_food_recognition_service is not None
            and GeminiFoodRecognitionService is not None
            and bool(settings.gemini_api_key)
        )

        # Default priority: OpenAI first, Gemini as fallback
        provider_order: List[tuple[str, Any]] = []
        if openai_available:
            provider_order.append(("openai", _run_openai))
        if gemini_available:
            provider_order.append(("gemini", _run_gemini))

        if not provider_order:
            raise RuntimeError(
                "No vision provider configured. "
                "Set OPENAI_API_KEY or GEMINI_API_KEY, or enable VISION_MOCK_MODE."
            )

        analysis_payload = None
        for provider_name, coroutine in provider_order:
            try:
                analysis_payload = await coroutine()
                break
            except asyncio.TimeoutError:
                message = f"{provider_name} analysis timed out."
                logger.error(message)
                provider_errors.append(message)
            except Exception as exc:  # pragma: no cover - log and attempt next provider
                message = f"{provider_name} analysis failed: {exc}"
                logger.exception(message)
                provider_errors.append(message)

        if not analysis_payload:
            combined = "; ".join(provider_errors) if provider_errors else "No provider succeeded."
            raise RuntimeError(f"Vision analysis failed; {combined}")

    return VisionResponse(
        calories=round(_coerce_float(analysis_payload.get("calories")), 1),
        protein=round(_coerce_float(analysis_payload.get("protein")), 1),
        carbs=round(_coerce_float(analysis_payload.get("carbs")), 1),
        fat=round(_coerce_float(analysis_payload.get("fat")), 1),
        image_url=_relative_url(saved_path),
        note=analysis_payload.get("note") or note,
        food_items=analysis_payload.get("food_items", []),
        confidence_score=analysis_payload.get("confidence_score"),
        insights=analysis_payload.get("insights", []),
        recommendations=analysis_payload.get("recommendations", []),
        source=analysis_payload.get("source"),
    )


