"""Meal analyzer routes."""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.food import (
    FoodAnalysisResult,
    FoodLog,
    FoodLogRead,
    ManualMealCreate,
    MealCorrection,
    ProductSearchResult,
)
from backend.models.user import User
from backend.services.meal_service import analyze_meal_image, create_manual_meal, correct_meal_analysis
from backend.services.product_service import search_products, get_product_by_barcode

router = APIRouter()


def _serialize_food_log(log: FoodLog) -> FoodLogRead:
    return FoodLogRead(
        id=log.id,
        image_path=log.image_path,
        total_calories=log.total_calories,
        macronutrients=log.macronutrients,
        food_items=log.food_items,
        confidence_score=log.confidence_score,
        created_at=log.created_at,
        is_manual=bool(log.is_manual) if log.is_manual is not None else False,
        is_corrected=bool(log.is_corrected) if log.is_corrected is not None else False,
        note=log.note,
    )


@router.get("/history", response_model=List[FoodLogRead])
def list_food_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> List[FoodLogRead]:
    """Return nutrition logs for the authenticated user."""

    logs = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == current_user.id)
        .order_by(FoodLog.created_at.desc())
        .all()
    )
    return [_serialize_food_log(log) for log in logs]


class FoodAnalysisResponse(FoodAnalysisResult):
    log: FoodLogRead


@router.post("/analyze", response_model=FoodAnalysisResponse)
async def analyze_food_upload(
    file: UploadFile = File(...),
    dietary_preferences: Optional[str] = Form(default=None),
    allergies: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
) -> FoodAnalysisResponse:
    """Analyze a meal photo using OpenAI vision."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No image uploaded")

    user_context: Dict[str, str] = {}
    if dietary_preferences:
        user_context["dietary_preferences"] = dietary_preferences
    if allergies:
        user_context["allergies"] = allergies

    log, analysis = await analyze_meal_image(file, current_user, user_context or None)
    return FoodAnalysisResponse(**analysis.model_dump(), log=_serialize_food_log(log))


@router.post("/manual", response_model=FoodLogRead)
def create_manual_meal_entry(
    meal_data: ManualMealCreate,
    current_user: User = Depends(get_current_user),
) -> FoodLogRead:
    """Create a manual meal entry without image analysis."""
    
    log = create_manual_meal(
        user=current_user,
        food_items=meal_data.food_items,
        total_calories=meal_data.total_calories,
        macronutrients=meal_data.macronutrients,
        note=meal_data.note,
    )
    
    return _serialize_food_log(log)


@router.put("/{food_log_id}/correct", response_model=FoodLogRead)
def correct_meal_entry(
    food_log_id: int,
    correction: MealCorrection,
    current_user: User = Depends(get_current_user),
) -> FoodLogRead:
    """Correct an existing meal analysis."""
    
    if correction.food_log_id != food_log_id:
        raise HTTPException(status_code=400, detail="Food log ID mismatch")
    
    log = correct_meal_analysis(
        food_log_id=food_log_id,
        user=current_user,
        food_items=correction.food_items,
        total_calories=correction.total_calories,
        macronutrients=correction.macronutrients,
        note=correction.note,
    )
    
    return _serialize_food_log(log)


@router.get("/{food_log_id}", response_model=FoodLogRead)
def get_food_log(
    food_log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> FoodLogRead:
    """Get a specific food log by ID."""
    
    log = (
        db.query(FoodLog)
        .filter(FoodLog.id == food_log_id, FoodLog.user_id == current_user.id)
        .first()
    )
    
    if not log:
        raise HTTPException(status_code=404, detail="Food log not found")
    
    return _serialize_food_log(log)


@router.get("/products/search", response_model=List[ProductSearchResult])
async def search_products_endpoint(
    query: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
) -> List[ProductSearchResult]:
    """Search for German food products."""
    
    if len(query.strip()) < 2:
        return []
    
    products = await search_products(query.strip(), limit=min(limit, 50))
    return products


@router.get("/products/barcode/{barcode}", response_model=ProductSearchResult)
async def get_product_by_barcode_endpoint(
    barcode: str,
    current_user: User = Depends(get_current_user),
) -> ProductSearchResult:
    """Get product information by barcode."""
    
    product = await get_product_by_barcode(barcode)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.delete("/{food_log_id}", status_code=200)
def delete_food_log(
    food_log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Delete a food log entry."""
    
    try:
        log = (
            db.query(FoodLog)
            .filter(FoodLog.id == food_log_id, FoodLog.user_id == current_user.id)
            .first()
        )
        
        if not log:
            raise HTTPException(status_code=404, detail="Food log not found")
        
        # Delete the log
        db.delete(log)
        db.commit()
        
        return {"message": "Food log deleted successfully", "id": food_log_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error deleting food log {food_log_id}: {error_details}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete food log: {str(e)}"
        )









