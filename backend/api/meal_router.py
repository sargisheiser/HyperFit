"""Meal analyzer routes."""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging

from backend.api.dependencies import get_current_user, get_db_session
from backend.core.rate_limit import limiter
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
@limiter.limit("10/minute")
async def analyze_food_upload(
    request: Request,
    file: UploadFile = File(...),
    dietary_preferences: Optional[str] = Form(default=None),
    allergies: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
) -> FoodAnalysisResponse:
    """Analyze a meal photo using OpenAI vision."""
    # File validation is handled in meal_service._store_image()

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

    try:
        log = correct_meal_analysis(
            food_log_id=food_log_id,
            user=current_user,
            food_items=correction.food_items,
            total_calories=correction.total_calories,
            macronutrients=correction.macronutrients,
            note=correction.note,
        )
        return _serialize_food_log(log)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{food_log_id}", status_code=200)
def delete_food_log(
    food_log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Delete a food log entry."""
    
    try:
        # Check if it belongs to the current user
        log = (
            db.query(FoodLog)
            .filter(FoodLog.id == food_log_id, FoodLog.user_id == current_user.id)
            .first()
        )
        
        if not log:
            # Check if the log exists at all (for better error message)
            any_log = db.query(FoodLog).filter(FoodLog.id == food_log_id).first()
            if not any_log:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Food log with ID {food_log_id} not found"
                )
            else:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Food log {food_log_id} does not belong to you"
                )
        
        # Get the date from the food log's created_at before deleting
        from datetime import datetime
        log_date = log.created_at.date() if log.created_at else datetime.utcnow().date()
        
        # Delete the log
        db.delete(log)
        
        # Also delete any associated Meal entries for the same date
        # Meals are created separately via /api/nutrition/meals/add and need to be cleaned up
        # Since there's no direct foreign key, we delete all meals for that date
        # This ensures consistency when FoodLogs are deleted
        from backend.models.nutrition import Meal
        
        meals_to_delete = (
            db.query(Meal)
            .filter(
                Meal.user_id == current_user.id,
                Meal.date == log_date
            )
            .all()
        )
        
        for meal in meals_to_delete:
            db.delete(meal)
        
        db.commit()
        
        # Update daily nutrition to reflect the deletion
        # This will recalculate calories and macros from remaining meals
        try:
            from backend.services.nutrition_service import get_daily_nutrition
            get_daily_nutrition(user_id=current_user.id, db=db)
        except (SQLAlchemyError, ValueError) as update_error:
            # Log the error but don't fail the deletion
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to update daily nutrition after deleting food log {food_log_id}: {update_error}")
        
        return {"message": "Food log deleted successfully", "id": food_log_id}
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database integrity error deleting food log {food_log_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete food log due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database error deleting food log {food_log_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting food log"
        )
    except ValueError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Validation error deleting food log {food_log_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error deleting food log {food_log_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting food log"
        )


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









