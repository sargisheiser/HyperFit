"""Tests for nutrition calculator (pure math, no DB)."""

import pytest


class TestNormalizeGoal:
    def test_build_goal(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("build") == "build"

    def test_gain_maps_to_build(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("gain") == "build"

    def test_bulk_maps_to_build(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("bulk") == "build"

    def test_lose_goal(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("lose") == "lose"

    def test_cut_maps_to_lose(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("cut") == "lose"

    def test_fat_loss_maps_to_lose(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("fat loss") == "lose"

    def test_maintain_goal(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("maintain") == "maintain"

    def test_recomp_goal(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("recomp") == "recomp"

    def test_strips_whitespace(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("  Build  ") == "build"

    def test_unknown_goal_passes_through(self):
        from backend.services.nutrition_calculator import _normalize_goal
        assert _normalize_goal("custom") == "custom"


class TestCalculateMacros:
    def test_calculates_protein_from_weight(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=80.0, calories_goal=2500)
        assert result["protein"] == pytest.approx(176.0, abs=1)  # 80 * 2.2

    def test_uses_protein_target_if_provided(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=80.0, calories_goal=2500, protein_target=150.0)
        assert result["protein"] == 150.0

    def test_default_protein_when_no_weight(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=None, calories_goal=2500)
        assert result["protein"] == 150.0

    def test_fat_is_25_percent_of_calories(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=80.0, calories_goal=2000)
        expected_fat = round((2000 * 0.25) / 9, 1)
        assert result["fat"] == pytest.approx(expected_fat, abs=0.5)

    def test_carbs_fill_remaining_calories(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=80.0, calories_goal=2500)
        protein_cal = result["protein"] * 4
        fat_cal = result["fat"] * 9
        carb_cal = result["carbs"] * 4
        total = protein_cal + fat_cal + carb_cal
        assert total == pytest.approx(2500, abs=5)

    def test_all_values_positive(self):
        from backend.services.nutrition_calculator import _calculate_macros
        result = _calculate_macros(weight=60.0, calories_goal=1800)
        assert result["protein"] > 0
        assert result["fat"] > 0
        assert result["carbs"] >= 0


class TestGoalAdjustments:
    def test_build_adds_calories(self):
        from backend.services.nutrition_calculator import GOAL_ADJUSTMENTS
        assert GOAL_ADJUSTMENTS["build"] == 200

    def test_lose_subtracts_calories(self):
        from backend.services.nutrition_calculator import GOAL_ADJUSTMENTS
        assert GOAL_ADJUSTMENTS["lose"] == -350

    def test_maintain_is_zero(self):
        from backend.services.nutrition_calculator import GOAL_ADJUSTMENTS
        assert GOAL_ADJUSTMENTS["maintain"] == 0
