"""Nutrition API endpoints."""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
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
    add_meal as add_meal_service,
)
from backend.services.nutrition_service import (
    ai_optimize as ai_optimize_service,
)
from backend.services.nutrition_service import (
    get_daily_nutrition as get_daily_nutrition_service,
)
from backend.services.nutrition_service import (
    list_meals as list_meals_service,
)
from backend.services.nutrition_service import (
    log_weight as log_weight_service,
)
from backend.services.nutrition_service import (
    recipe_suggestions as recipe_suggestions_service,
)
from backend.services.nutrition_service import (
    record_checkin as record_checkin_service,
)
from backend.services.nutrition_service import (
    update_daily_nutrition as update_daily_nutrition_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/daily/{user_id}", response_model=NutritionStats)
def get_daily_nutrition(
    user_id: int = Path(..., gt=0),
    date: date | None = Query(None, description="Date to get nutrition for (YYYY-MM-DD). Defaults to today."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> NutritionStats:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return get_daily_nutrition_service(user_id=current_user.id, db=db, target_date=date)


@router.post("/update", response_model=NutritionStats)
def update_nutrition(
    payload: NutritionBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> NutritionStats:
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return update_daily_nutrition_service(payload=payload, db=db)


@router.post("/weight", response_model=WeightLogRead)
def log_weight(
    payload: WeightUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> WeightLogRead:
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return log_weight_service(payload=payload, db=db)


@router.post("/checkin", response_model=CheckInRead)
def submit_checkin(
    payload: CheckIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> CheckInRead:
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return record_checkin_service(payload=payload, db=db)


@router.get("/ai_optimize", response_model=AIOptimizationResponse)
def ai_optimize(
    user_id: int = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> AIOptimizationResponse:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    try:
        return ai_optimize_service(user_id=current_user.id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/recipes", response_model=RecipesResponse)
def get_recipes(
    user_id: int = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> RecipesResponse:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return recipe_suggestions_service(user_id=current_user.id, db=db)


@router.post("/meals/add", response_model=MealAddResponse)
def add_meal(
    payload: MealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> MealAddResponse:
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return add_meal_service(payload=payload, db=db)


@router.get("/meals/history", response_model=MealReadList)
def meal_history(
    user_id: int = Query(..., gt=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> MealReadList:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return list_meals_service(user_id=current_user.id, db=db, limit=limit)


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
            logger.warning(f"Failed to update daily nutrition after deleting meal: {update_error}")

        return {"message": f"Meal {meal_id} deleted successfully", "meal_id": meal_id}

    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error deleting meal: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete meal due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting meal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting meal"
        )
    except Exception as e:
        db.rollback()
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
            logger.warning(f"Failed to update daily nutrition after deleting all meals: {update_error}")

        return {"message": f"Deleted {deleted_count} meals successfully", "count": deleted_count}
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error deleting all meals: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete meals due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deleting all meals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while deleting meals"
        )
    except ValueError as e:
        db.rollback()
        logger.error(f"Validation error deleting all meals: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error deleting all meals: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting meals"
        )


