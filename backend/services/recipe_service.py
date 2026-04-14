"""Recipe suggestions service."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.schemas.nutrition import RecipesResponse, RecipeSuggestion


def recipe_suggestions(user_id: int, db: Session) -> RecipesResponse:  # noqa: ARG001
    suggestions: list[RecipeSuggestion] = [
        RecipeSuggestion(
            title="High-Protein Greek Yogurt Bowl",
            calories=420, protein=35, carbs=45, fat=10,
            url="https://www.eatingwell.com/recipe/252799/greek-yogurt-with-fruit-nuts/",
        ),
        RecipeSuggestion(
            title="Chicken Quinoa Power Bowl",
            calories=560, protein=48, carbs=55, fat=16,
            url="https://www.feastingathome.com/healthy-quinoa-chicken-salad/",
        ),
        RecipeSuggestion(
            title="Salmon and Sweet Potato Sheet Pan",
            calories=610, protein=45, carbs=50, fat=22,
            url="https://www.wellplated.com/baked-salmon-sweet-potatoes/",
        ),
    ]
    return RecipesResponse(user_id=user_id, suggestions=suggestions)
