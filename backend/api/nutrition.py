"""Nutrition API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from backend.api.dependencies import get_db_session
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
    db: Session = Depends(get_db_session),
) -> NutritionStats:
    return get_daily_nutrition_service(user_id=user_id, db=db)


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


