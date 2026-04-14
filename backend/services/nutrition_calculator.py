"""Pure math functions for nutrition calculations. No database access."""

from __future__ import annotations

GOAL_ADJUSTMENTS: dict[str, float] = {
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


def _calculate_macros(
    weight: float | None,
    calories_goal: float,
    protein_target: float | None = None,
) -> dict[str, float]:
    """Compute macro targets based on weight and calorie goal."""
    if protein_target and protein_target > 0:
        protein_g = float(protein_target)
    elif weight and weight > 0:
        protein_g = round(weight * 2.2, 1)
    else:
        protein_g = 150.0

    fat_g = round((calories_goal * 0.25) / 9, 1)

    protein_calories = protein_g * 4
    fat_calories = fat_g * 9
    remaining_calories = max(calories_goal - protein_calories - fat_calories, 0)
    carbs_g = round(remaining_calories / 4, 1)

    return {
        "protein": protein_g,
        "fat": fat_g,
        "carbs": carbs_g,
    }
