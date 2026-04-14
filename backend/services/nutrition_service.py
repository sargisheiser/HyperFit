"""Nutrition service — thin re-export layer.

All functions are implemented in focused modules:
- nutrition_calculator.py — pure math
- nutrition_stats.py — daily stats + aggregation
- meal_crud.py — meal/weight/checkin CRUD
- recipe_service.py — recipe suggestions

This file re-exports everything so existing router imports don't break.
"""

from backend.services.meal_crud import (  # noqa: F401
    add_meal,
    list_meals,
    log_weight,
    record_checkin,
)
from backend.services.nutrition_calculator import (  # noqa: F401
    GOAL_ADJUSTMENTS,
    _calculate_macros,
    _normalize_goal,
)
from backend.services.nutrition_stats import (  # noqa: F401
    _aggregate_meals_for_date,
    _get_user_calorie_goal,
    _latest_checkin,
    _latest_daily_record,
    _today,
    ai_optimize,
    get_daily_nutrition,
    update_daily_nutrition,
)
from backend.services.recipe_service import recipe_suggestions  # noqa: F401
