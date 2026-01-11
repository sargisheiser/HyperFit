"""Nutrition API endpoints."""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging

from backend.api.dependencies import get_db_session, get_current_user
from backend.models.user import User
from backend.schemas.nutrition import (
    AIOptimizationResponse,
    CheckIn,
    CheckInRead,
    MealAddResponse,
    MealCreate,
    MealReadList,
    NutritionBase,
    NutritionStats,
    RecipesResponse,
    WeightLogRead,
    WeightUpdate,
)
from backend.services.nutrition_service import (
    ai_optimize as ai_optimize_service,
    get_daily_nutrition as get_daily_nutrition_service,
    add_meal as add_meal_service,
    list_meals as list_meals_service,
    log_weight as log_weight_service,
    recipe_suggestions as recipe_suggestions_service,
    record_checkin as record_checkin_service,
    update_daily_nutrition as update_daily_nutrition_service,
)


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/daily/{user_id}", response_model=NutritionStats)
def get_daily_nutrition(
    user_id: int = Path(..., gt=0),
    date: Optional[date] = Query(None, description="Date to get nutrition for (YYYY-MM-DD). Defaults to today."),
    db: Session = Depends(get_db_session),
) -> NutritionStats:
    return get_daily_nutrition_service(user_id=user_id, db=db, target_date=date)


@router.post("/update", response_model=NutritionStats)
def update_nutrition(
    payload: NutritionBase,
    db: Session = Depends(get_db_session),
) -> NutritionStats:
    return update_daily_nutrition_service(payload=payload, db=db)


@router.post("/weight", response_model=WeightLogRead)
def log_weight(
    payload: WeightUpdate,
    db: Session = Depends(get_db_session),
) -> WeightLogRead:
    return log_weight_service(payload=payload, db=db)


@router.post("/checkin", response_model=CheckInRead)
def submit_checkin(
    payload: CheckIn,
    db: Session = Depends(get_db_session),
) -> CheckInRead:
    return record_checkin_service(payload=payload, db=db)


@router.get("/ai_optimize", response_model=AIOptimizationResponse)
def ai_optimize(
    user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db_session),
) -> AIOptimizationResponse:
    try:
        return ai_optimize_service(user_id=user_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/recipes", response_model=RecipesResponse)
def get_recipes(
    user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db_session),
) -> RecipesResponse:
    return recipe_suggestions_service(user_id=user_id, db=db)


@router.post("/meals/add", response_model=MealAddResponse)
def add_meal(
    payload: MealCreate,
    db: Session = Depends(get_db_session),
) -> MealAddResponse:
    return add_meal_service(payload=payload, db=db)


@router.get("/meals/history", response_model=MealReadList)
def meal_history(
    user_id: int = Query(..., gt=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> MealReadList:
    return list_meals_service(user_id=user_id, db=db, limit=limit)


@router.delete("/meals/{meal_id}", status_code=200)
def delete_meal(
    meal_id: int = Path(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Delete a single meal entry."""
    from backend.models.nutrition import Meal
    from backend.services.nutrition_service import get_daily_nutrition
    
    try:
        # Check if meal exists and belongs to current user
        meal = (
            db.query(Meal)
            .filter(Meal.id == meal_id, Meal.user_id == current_user.id)
            .first()
        )
        
        if not meal:
            # Check if meal exists at all
            any_meal = db.query(Meal).filter(Meal.id == meal_id).first()
            if not any_meal:
                raise HTTPException(
                    status_code=404,
                    detail=f"Meal with ID {meal_id} not found"
                )
            else:
                raise HTTPException(
                    status_code=403,
                    detail=f"Meal {meal_id} does not belong to you"
                )
        
        # Get the date before deleting
        meal_date = meal.date
        
        # Delete the meal
        db.delete(meal)
        db.commit()
        
        # Update daily nutrition to reflect the deletion
        try:
            get_daily_nutrition(user_id=current_user.id, db=db, target_date=meal_date)
        except (SQLAlchemyError, ValueError) as update_error:
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to update daily nutrition after deleting meal: {update_error}")
        
        return {"message": f"Meal {meal_id} deleted successfully", "meal_id": meal_id}
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database integrity error deleting meal: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete meal due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database error deleting meal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting meal"
        )
    except Exception as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error deleting meal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meal: {str(e)}"
        )


@router.delete("/meals/all", status_code=200)
def delete_all_meals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Delete all meals for the current user."""
    from backend.models.nutrition import Meal
    from backend.services.nutrition_service import get_daily_nutrition
    
    try:
        # Delete all meals for the user
        deleted_count = db.query(Meal).filter(Meal.user_id == current_user.id).delete()
        db.commit()
        
        # Update daily nutrition to reflect the deletion
        try:
            get_daily_nutrition(user_id=current_user.id, db=db)
        except (SQLAlchemyError, ValueError) as update_error:
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to update daily nutrition after deleting all meals: {update_error}")
        
        return {"message": f"Deleted {deleted_count} meals successfully", "count": deleted_count}
    except IntegrityError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database integrity error deleting all meals: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete meals due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Database error deleting all meals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting meals"
        )
    except ValueError as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Validation error deleting all meals: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error deleting all meals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting meals"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete meals: {str(e)}"
        )


