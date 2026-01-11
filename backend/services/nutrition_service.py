"""Business logic for nutrition tracking."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.nutrition import DailyNutrition, Meal, NutritionCheckIn, WeightLog
from backend.models.food import FoodLog
from backend.models.user import User
from backend.schemas.nutrition import (
    AIOptimizationResponse,
    CheckIn,
    CheckInRead,
    MealAddResponse,
    MealCreate,
    MealRead,
    MealReadList,
    NutritionBase,
    NutritionStats,
    RecipeSuggestion,
    RecipesResponse,
    WeightLogRead,
    WeightUpdate,
)

GOAL_ADJUSTMENTS: Dict[str, float] = {
    "build": 200,
    "gain": 200,
    "bulk": 200,
    "maintain": 0,
    "recomp": -100,
    "lose": -350,
    "cut": -400,
}


def _normalize_goal(goal: str) -> str:
    normalized = goal.strip().lower()
    mapping = {
        "build": "build",
        "gain": "build",
        "bulk": "build",
        "maintain": "maintain",
        "recomp": "recomp",
        "lose": "lose",
        "cut": "lose",
        "fat loss": "lose",
    }
    return mapping.get(normalized, normalized)


def _calculate_macros(weight: Optional[float], calories_goal: float, protein_target: Optional[float] = None) -> Dict[str, float]:
    """Compute macro targets based on weight and calorie goal.
    
    If protein_target is provided (from user profile), use it.
    Otherwise, calculate based on weight (2.2g per kg for muscle building).
    """
    if protein_target and protein_target > 0:
        protein_g = float(protein_target)
    elif weight and weight > 0:
        # Protein: 2.2g per kg bodyweight (for muscle building)
        protein_g = round(weight * 2.2, 1)
    else:
        # Default fallback
        protein_g = 150.0
    
    # Fat: 25-30% of calories (use 25% for calculation)
    fat_g = round((calories_goal * 0.25) / 9, 1)  # 9 kcal per gram
    
    # Carbs: Remaining calories after protein and fat
    protein_calories = protein_g * 4  # 4 kcal per gram
    fat_calories = fat_g * 9  # 9 kcal per gram
    remaining_calories = max(calories_goal - protein_calories - fat_calories, 0)
    carbs_g = round(remaining_calories / 4, 1)  # 4 kcal per gram
    
    return {
        "protein": protein_g,
        "fat": fat_g,
        "carbs": carbs_g,
    }


def _get_user_calorie_goal(user: User, db: Session) -> float:
    """Get calorie goal from user profile or calculate from profile data.
    
    Priority:
    1. daily_calorie_target from user profile
    2. Calculate from latest DailyNutrition record
    3. Calculate from user profile data (weight, height, age, activity_level)
    """
    # Priority 1: Use daily_calorie_target from profile
    if user.daily_calorie_target and user.daily_calorie_target > 0:
        return float(user.daily_calorie_target)
    
    # Priority 2: Use latest DailyNutrition calories_goal
    latest_daily = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == user.id)
        .order_by(DailyNutrition.date.desc())
        .first()
    )
    if latest_daily and latest_daily.calories_goal and latest_daily.calories_goal > 0:
        return latest_daily.calories_goal
    
    # Priority 3: Calculate from user profile (simplified calculation)
    if user.weight_kg and user.height_cm and user.birth_date:
        # Calculate age
        today = date.today()
        age = today.year - user.birth_date.year
        if (today.month, today.day) < (user.birth_date.month, user.birth_date.day):
            age -= 1
        
        # Calculate BMR using Mifflin-St Jeor Equation
        if user.gender == "female":
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age - 161
        else:
            bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * age + 5
        
        # Activity multipliers
        activity_multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        activity_level = user.activity_level or "moderate"
        multiplier = activity_multipliers.get(activity_level, 1.55)
        
        tdee = bmr * multiplier
        # Default to build goal (+500 kcal surplus)
        return round(tdee + 500, 0)
    
    # Fallback: Default calorie goal
    return 2500.0


def _today() -> date:
    # Use local date instead of UTC to match user's timezone
    # This ensures daily values reset at midnight in the user's local timezone
    return date.today()


def _aggregate_meals_for_date(user_id: int, target_date: date, db: Session) -> Dict[str, float]:
    """Aggregate all meals and food logs for a specific date to calculate consumed calories and macros."""
    from datetime import datetime
    
    # Get meals from Meal table
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.date == target_date)
        .all()
    )
    
    # Get food logs from FoodLog table for the same date
    # FoodLog uses created_at (datetime), so we need to filter by date
    start_datetime = datetime.combine(target_date, datetime.min.time())
    end_datetime = datetime.combine(target_date, datetime.max.time()) + timedelta(days=1)
    
    food_logs = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == user_id,
            FoodLog.created_at >= start_datetime,
            FoodLog.created_at < end_datetime
        )
        .all()
    )
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"Aggregating {len(meals)} meals and {len(food_logs)} food logs for user {user_id} on date {target_date}")
    
    # Aggregate from Meal table
    total_calories = sum(meal.calories or 0.0 for meal in meals)
    total_protein = sum(meal.protein or 0.0 for meal in meals)
    total_carbs = sum(meal.carbs or 0.0 for meal in meals)
    total_fat = sum(meal.fat or 0.0 for meal in meals)
    
    # Aggregate from FoodLog table
    for log in food_logs:
        # Get calories from total_calories field
        log_calories = log.total_calories or 0.0
        total_calories += log_calories
        
        # Get macros from macronutrients JSON field
        if log.macronutrients:
            if isinstance(log.macronutrients, dict):
                total_protein += log.macronutrients.get('protein_grams', 0.0) or 0.0
                total_carbs += log.macronutrients.get('carbs_grams', 0.0) or 0.0
                total_fat += log.macronutrients.get('fat_grams', 0.0) or 0.0
            elif isinstance(log.macronutrients, str):
                # Handle JSON string
                import json
                try:
                    macros = json.loads(log.macronutrients)
                    total_protein += macros.get('protein_grams', 0.0) or 0.0
                    total_carbs += macros.get('carbs_grams', 0.0) or 0.0
                    total_fat += macros.get('fat_grams', 0.0) or 0.0
                except (json.JSONDecodeError, TypeError):
                    pass
    
    # Log individual meal values for debugging
    for meal in meals:
        logger.debug(f"Meal {meal.id}: calories={meal.calories}, protein={meal.protein}, carbs={meal.carbs}, fat={meal.fat}")
    for log in food_logs:
        logger.debug(f"FoodLog {log.id}: calories={log.total_calories}, macros={log.macronutrients}")
    
    result = {
        "calories_consumed": round(total_calories, 1),
        "protein": round(total_protein, 1),
        "carbs": round(total_carbs, 1),
        "fat": round(total_fat, 1),
    }
    
    logger.debug(f"Aggregated result: {result}")
    return result


def get_daily_nutrition(user_id: int, db: Session, target_date: Optional[date] = None) -> NutritionStats:
    """Get daily nutrition stats, aggregating from all meals for a specific date.
    
    Automatically synchronizes calories_goal with user profile daily_calorie_target.
    If target_date is None, uses today's date.
    """
    if target_date is None:
        target_date = _today()
    today = target_date
    
    # Get user to access profile data
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    # Get calorie goal from user profile (synchronized)
    calories_goal = _get_user_calorie_goal(user, db)
    
    # Get or create DailyNutrition record for today
    record = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == user_id, DailyNutrition.date == today)
        .one_or_none()
    )
    
    # Aggregate all meals for today
    aggregated = _aggregate_meals_for_date(user_id, today, db)
    
    # Get latest weight from user profile or weight logs
    current_weight = user.weight_kg
    if not current_weight:
        latest_weight_log = (
            db.query(WeightLog)
            .filter(WeightLog.user_id == user_id)
            .order_by(WeightLog.date.desc())
            .first()
        )
        if latest_weight_log:
            current_weight = latest_weight_log.weight
    
    # Calculate macro targets based on weight and calorie goal
    macros = _calculate_macros(
        current_weight,
        calories_goal,
        protein_target=user.daily_protein_target if user.daily_protein_target else None,
    )
    
    if record:
        # Always update record with aggregated values from meals (ensures values reset to 0 for new day)
        # This ensures that if all meals are deleted, values go back to 0
        record.calories_consumed = aggregated["calories_consumed"]
        record.protein = aggregated["protein"]  # Consumed protein
        record.carbs = aggregated["carbs"]  # Consumed carbs
        record.fat = aggregated["fat"]  # Consumed fat
        
        # Sync calories_goal with user profile
        if record.calories_goal != calories_goal:
            record.calories_goal = calories_goal
        
        # Update weight if available
        if current_weight:
            record.weight = current_weight
        
        # Recalculate compliance
        if record.calories_goal and record.calories_goal > 0:
            record.compliance = round(
                (record.calories_consumed / record.calories_goal) * 100,
                1,
            )
        else:
            record.compliance = None
        
        db.commit()
        db.refresh(record)
        return NutritionStats.model_validate(record)
    
    # No record exists, create one with aggregated values and synced goal
    record = DailyNutrition(
        user_id=user_id,
        date=today,
        calories_goal=calories_goal,
        calories_consumed=aggregated["calories_consumed"],
        protein=aggregated["protein"],  # Consumed protein
        carbs=aggregated["carbs"],  # Consumed carbs
        fat=aggregated["fat"],  # Consumed fat
        weight=current_weight,
        compliance=round((aggregated["calories_consumed"] / calories_goal * 100), 1) if calories_goal > 0 else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return NutritionStats.model_validate(record)


def update_daily_nutrition(payload: NutritionBase, db: Session) -> NutritionStats:
    """Update daily nutrition, synchronizing calories_goal with user profile if not explicitly provided."""
    today = _today()
    
    # Get user to access profile data
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise ValueError(f"User {payload.user_id} not found")
    
    # Use provided calories_goal or sync from user profile
    calories_goal = payload.calories_goal
    if not calories_goal or calories_goal == 0:
        calories_goal = _get_user_calorie_goal(user, db)
    else:
        # If explicitly provided, update user profile to keep in sync
        if user.daily_calorie_target != calories_goal:
            user.daily_calorie_target = int(calories_goal)
            db.commit()

    record = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == payload.user_id, DailyNutrition.date == today)
        .one_or_none()
    )

    # Use provided weight or get from user profile
    weight = payload.weight
    if not weight:
        weight = user.weight_kg
        if not weight:
            latest_weight_log = (
                db.query(WeightLog)
                .filter(WeightLog.user_id == payload.user_id)
                .order_by(WeightLog.date.desc())
                .first()
            )
            if latest_weight_log:
                weight = latest_weight_log.weight

    # Always aggregate consumed calories and macros from meals to ensure synchronization
    aggregated = _aggregate_meals_for_date(payload.user_id, today, db)
    calories_consumed = aggregated["calories_consumed"]
    # Only use payload value if it's explicitly set and different (for manual overrides)
    # But by default, always use aggregated value from meals
    
    compliance = None
    if calories_goal and calories_goal > 0:
        compliance = round((calories_consumed / calories_goal) * 100, 1)

    if record:
        record.calories_goal = calories_goal
        record.calories_consumed = aggregated["calories_consumed"]  # From meals
        record.protein = aggregated["protein"]  # Consumed protein from meals
        record.carbs = aggregated["carbs"]  # Consumed carbs from meals
        record.fat = aggregated["fat"]  # Consumed fat from meals
        record.weight = weight
        record.compliance = compliance
    else:
        record = DailyNutrition(
            user_id=payload.user_id,
            date=today,
            calories_goal=calories_goal,
            calories_consumed=aggregated["calories_consumed"],  # From meals
            protein=aggregated["protein"],  # Consumed protein from meals
            carbs=aggregated["carbs"],  # Consumed carbs from meals
            fat=aggregated["fat"],  # Consumed fat from meals
            weight=weight,
            compliance=compliance,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return NutritionStats.model_validate(record)


def log_weight(payload: WeightUpdate, db: Session) -> WeightLogRead:
    entry = WeightLog(user_id=payload.user_id, weight=payload.weight, date=_today())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return WeightLogRead.model_validate(entry)


def record_checkin(payload: CheckIn, db: Session) -> CheckInRead:
    normalized_goal = _normalize_goal(payload.goal)
    calories_change = payload.calories_new - payload.calories_previous

    record = NutritionCheckIn(
        user_id=payload.user_id,
        goal=normalized_goal,
        body_fat=payload.body_fat,
        calories_previous=payload.calories_previous,
        calories_new=payload.calories_new,
        calories_change=calories_change,
        compliance=payload.compliance,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return CheckInRead.model_validate(record)


def _latest_daily_record(user_id: int, db: Session) -> Optional[DailyNutrition]:
    return (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == user_id)
        .order_by(DailyNutrition.date.desc())
        .first()
    )


def _latest_checkin(user_id: int, db: Session) -> Optional[NutritionCheckIn]:
    return (
        db.query(NutritionCheckIn)
        .filter(NutritionCheckIn.user_id == user_id)
        .order_by(NutritionCheckIn.date.desc())
        .first()
    )


def ai_optimize(user_id: int, db: Session) -> AIOptimizationResponse:
    daily = _latest_daily_record(user_id, db)
    checkin = _latest_checkin(user_id, db)

    if not daily and not checkin:
        raise ValueError("No nutrition context available for user")

    base_calories = daily.calories_goal if daily else checkin.calories_new or checkin.calories_previous
    goal = checkin.goal if checkin else "maintain"
    adjustment = GOAL_ADJUSTMENTS.get(goal, 0)

    compliance = None
    if daily and daily.compliance is not None:
        compliance = daily.compliance

    if compliance and compliance < 80:
        adjustment -= 100

    recommended = max(base_calories + adjustment, 1200)
    reasoning = (
        f"Adjusted {adjustment:+.0f} calories based on goal '{goal}'"
        f"{' and recent compliance trends' if compliance is not None else ''}."
    )

    return AIOptimizationResponse(
        user_id=user_id,
        current_calories=base_calories,
        recommended_calories=round(recommended, 0),
        reasoning=reasoning,
    )


def recipe_suggestions(user_id: int, db: Session) -> RecipesResponse:  # noqa: ARG001
    suggestions: List[RecipeSuggestion] = [
        RecipeSuggestion(
            title="High-Protein Greek Yogurt Bowl",
            calories=420,
            protein=35,
            carbs=45,
            fat=10,
            url="https://www.eatingwell.com/recipe/252799/greek-yogurt-with-fruit-nuts/",
        ),
        RecipeSuggestion(
            title="Chicken Quinoa Power Bowl",
            calories=560,
            protein=48,
            carbs=55,
            fat=16,
            url="https://www.feastingathome.com/healthy-quinoa-chicken-salad/",
        ),
        RecipeSuggestion(
            title="Salmon and Sweet Potato Sheet Pan",
            calories=610,
            protein=45,
            carbs=50,
            fat=22,
            url="https://www.wellplated.com/baked-salmon-sweet-potatoes/",
        ),
    ]
    return RecipesResponse(user_id=user_id, suggestions=suggestions)


def add_meal(payload: MealCreate, db: Session) -> MealAddResponse:
    """Add a meal and update daily nutrition, synchronizing calories_goal with user profile."""
    meal_date = payload.date or _today()

    # Validate and ensure calories are not zero or None
    meal_calories = payload.calories or 0.0
    meal_protein = payload.protein or 0.0
    meal_carbs = payload.carbs or 0.0
    meal_fat = payload.fat or 0.0
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(
        f"Adding meal for user {payload.user_id} on {meal_date}: "
        f"calories={meal_calories}, protein={meal_protein}, carbs={meal_carbs}, fat={meal_fat}"
    )
    
    meal = Meal(
        user_id=payload.user_id,
        date=meal_date,
        calories=meal_calories,
        protein=meal_protein,
        carbs=meal_carbs,
        fat=meal_fat,
        note=payload.note,
        image_url=payload.image_url,
    )
    db.add(meal)
    db.flush()  # Flush to get meal ID, but don't commit yet
    
    # Verify meal was saved correctly
    logger.debug(f"Meal saved: id={meal.id}, calories={meal.calories}, protein={meal.protein}")

    # Get user to access profile data
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise ValueError(f"User {payload.user_id} not found")
    
    # Get calorie goal from user profile (synchronized)
    calories_goal = _get_user_calorie_goal(user, db)

    # Get or create DailyNutrition record
    daily = (
        db.query(DailyNutrition)
        .filter(DailyNutrition.user_id == payload.user_id, DailyNutrition.date == meal_date)
        .one_or_none()
    )

    if not daily:
        daily = DailyNutrition(
            user_id=payload.user_id,
            date=meal_date,
            calories_goal=calories_goal,
            calories_consumed=0.0,
            protein=0.0,
            carbs=0.0,
            fat=0.0,
            weight=user.weight_kg,
        )
        db.add(daily)
    else:
        # Sync calories_goal with user profile
        if daily.calories_goal != calories_goal:
            daily.calories_goal = calories_goal

    # Re-aggregate all meals for this date to ensure accuracy
    # IMPORTANT: Flush first to ensure the new meal is included in the query
    db.flush()
    aggregated = _aggregate_meals_for_date(payload.user_id, meal_date, db)
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"Aggregated meals for date {meal_date}: calories={aggregated['calories_consumed']}, protein={aggregated['protein']}")
    
    daily.calories_consumed = aggregated["calories_consumed"]
    daily.protein = aggregated["protein"]
    daily.carbs = aggregated["carbs"]
    daily.fat = aggregated["fat"]

    # Recalculate compliance if goal is set
    if daily.calories_goal and daily.calories_goal > 0:
        daily.compliance = round(
            (daily.calories_consumed / daily.calories_goal) * 100,
            1,
        )
    else:
        daily.compliance = None

    db.commit()
    db.refresh(meal)
    db.refresh(daily)

    return MealAddResponse(
        status="saved",
        meal=MealRead.model_validate(meal),
        daily=NutritionStats.model_validate(daily),
    )


def list_meals(user_id: int, db: Session, limit: int = 20) -> MealReadList:
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user_id)
        .order_by(Meal.date.desc(), Meal.created_at.desc())
        .limit(limit)
        .all()
    )
    return MealReadList(
        user_id=user_id, meals=[MealRead.model_validate(m) for m in meals]
    )


