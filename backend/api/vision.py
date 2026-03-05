"""Vision analysis endpoints for AI-powered meal insights."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.user import User
from backend.schemas.vision import VisionResponse
from backend.services.vision_service import analyze_meal_image

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/analyze")
async def analyze_meal(
    request: Request,
    note: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
    image_base64: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
):
    if image is None and not image_base64:
        raise HTTPException(status_code=400, detail="Provide an image upload or base64 data.")

    try:
        vision_result: VisionResponse = await analyze_meal_image(
            upload=image,
            image_base64=image_base64,
            note=note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "success",
        "meal": {
            "calories": vision_result.calories,
            "protein": vision_result.protein,
            "carbs": vision_result.carbs,
            "fat": vision_result.fat,
            "macronutrients": {
                "protein_grams": vision_result.protein,
                "carbs_grams": vision_result.carbs,
                "fat_grams": vision_result.fat,
            },
            "food_items": vision_result.food_items,
            "confidence_score": vision_result.confidence_score,
            "insights": vision_result.insights,
            "recommendations": vision_result.recommendations,
            "source": vision_result.source,
            "image_url": vision_result.image_url,
            "note": vision_result.note,
            "user_id": current_user.id,
        },
    }

