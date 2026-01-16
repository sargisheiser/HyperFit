"""Comprehensive tests for meal/food API endpoints."""

from datetime import date
import pytest
import uuid


@pytest.fixture
def auth_user(client):
    """Create and authenticate a user, return headers with token."""
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "email": f"meal.test.{unique_id}@example.com",
        "username": f"mealuser_{unique_id}",
        "password": "SecurePass123!",
        "full_name": "Meal Test User",
        "birth_date": date(1990, 1, 1).isoformat(),
        "height_cm": 175,
        "weight_kg": 70,
        "gender": "male",
        "activity_level": "moderate",
        "fitness_goals": ["strength"],
        "dietary_preferences": [],
        "allergies": [],
    }

    reg_response = client.post("/api/users/register", json=user_payload)
    assert reg_response.status_code == 201
    user_data = reg_response.json()

    login_response = client.post("/api/users/login", json={
        "email": user_payload["email"],
        "password": user_payload["password"],
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user_data,
    }


@pytest.fixture
def sample_food_items():
    """Sample food items for manual meal creation."""
    return [
        {
            "name": "Grilled Chicken Breast",
            "calories": 165,
            "protein_grams": 31,
            "carbs_grams": 0,
            "fat_grams": 3.6,
            "quantity": "100g",
        },
        {
            "name": "Brown Rice",
            "calories": 111,
            "protein_grams": 2.6,
            "carbs_grams": 23,
            "fat_grams": 0.9,
            "quantity": "100g",
        },
    ]


class TestManualMealCreation:
    """Tests for manual meal entry endpoint."""

    def test_create_manual_meal_success(self, client, auth_user, sample_food_items):
        """Test successful manual meal creation."""
        response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={
                "food_items": sample_food_items,
                "note": "Post-workout meal",
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] > 0
        assert data["is_manual"] is True
        assert data["is_corrected"] is False
        assert data["total_calories"] > 0
        assert data["note"] == "Post-workout meal"
        assert "macronutrients" in data
        assert len(data["food_items"]) == 2

    def test_create_manual_meal_with_totals(self, client, auth_user, sample_food_items):
        """Test manual meal creation with explicit totals."""
        response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={
                "food_items": sample_food_items,
                "total_calories": 500,
                "macronutrients": {
                    "protein_grams": 40,
                    "carbs_grams": 50,
                    "fat_grams": 10,
                },
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["total_calories"] == 500
        assert data["macronutrients"]["protein_grams"] == 40

    def test_create_manual_meal_empty_items(self, client, auth_user):
        """Test manual meal creation with empty food items."""
        response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={
                "food_items": [],
            }
        )

        # Should succeed but with zero calories
        assert response.status_code == 200
        data = response.json()
        assert data["total_calories"] == 0

    def test_create_manual_meal_unauthenticated(self, client, sample_food_items):
        """Test manual meal creation without authentication."""
        response = client.post(
            "/api/food/manual",
            json={"food_items": sample_food_items}
        )

        assert response.status_code == 401

    def test_create_manual_meal_sanitizes_note(self, client, auth_user, sample_food_items):
        """Test that notes are sanitized for XSS."""
        response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={
                "food_items": sample_food_items,
                "note": "<script>alert('XSS')</script>Healthy meal",
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Script tag should be escaped
        assert "<script>" not in data["note"]
        assert "Healthy meal" in data["note"]


class TestFoodLogHistory:
    """Tests for food log history endpoint."""

    def test_get_history_empty(self, client, auth_user):
        """Test getting history when user has no meals."""
        response = client.get(
            "/api/food/history",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_get_history_with_meals(self, client, auth_user, sample_food_items):
        """Test getting history after creating meals."""
        # Create two meals
        for i in range(2):
            client.post(
                "/api/food/manual",
                headers=auth_user["headers"],
                json={"food_items": sample_food_items, "note": f"Meal {i+1}"}
            )

        response = client.get(
            "/api/food/history",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Verify both meals are present (order may vary due to timestamp resolution)
        notes = {d["note"] for d in data}
        assert notes == {"Meal 1", "Meal 2"}

    def test_get_history_unauthenticated(self, client):
        """Test getting history without authentication."""
        response = client.get("/api/food/history")
        assert response.status_code == 401


class TestGetFoodLog:
    """Tests for getting individual food log."""

    def test_get_food_log_success(self, client, auth_user, sample_food_items):
        """Test getting a specific food log."""
        # Create a meal
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items, "note": "Test meal"}
        )
        meal_id = create_response.json()["id"]

        # Get the meal
        response = client.get(
            f"/api/food/{meal_id}",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == meal_id
        assert data["note"] == "Test meal"

    def test_get_food_log_not_found(self, client, auth_user):
        """Test getting non-existent food log."""
        response = client.get(
            "/api/food/999999",
            headers=auth_user["headers"],
        )

        assert response.status_code == 404

    def test_get_other_users_food_log(self, client, auth_user, sample_food_items):
        """Test that user cannot get another user's food log."""
        # Create a meal with first user
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items}
        )
        meal_id = create_response.json()["id"]

        # Create second user
        unique_id = uuid.uuid4().hex[:8]
        second_user_payload = {
            "email": f"other.{unique_id}@example.com",
            "username": f"otheruser_{unique_id}",
            "password": "SecurePass123!",
            "full_name": "Other User",
            "birth_date": date(1990, 1, 1).isoformat(),
            "height_cm": 175,
            "weight_kg": 70,
            "gender": "female",
            "activity_level": "moderate",
            "fitness_goals": [],
            "dietary_preferences": [],
            "allergies": [],
        }
        client.post("/api/users/register", json=second_user_payload)
        login_response = client.post("/api/users/login", json={
            "email": second_user_payload["email"],
            "password": second_user_payload["password"],
        })
        second_token = login_response.json()["access_token"]

        # Try to get first user's meal with second user's token
        response = client.get(
            f"/api/food/{meal_id}",
            headers={"Authorization": f"Bearer {second_token}"},
        )

        # Should return 404 (not found for this user)
        assert response.status_code == 404


class TestDeleteFoodLog:
    """Tests for deleting food logs."""

    def test_delete_food_log_success(self, client, auth_user, sample_food_items):
        """Test successful food log deletion."""
        # Create a meal
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items}
        )
        meal_id = create_response.json()["id"]

        # Delete the meal
        response = client.delete(
            f"/api/food/{meal_id}",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        assert response.json()["id"] == meal_id

        # Verify it's deleted
        get_response = client.get(
            f"/api/food/{meal_id}",
            headers=auth_user["headers"],
        )
        assert get_response.status_code == 404

    def test_delete_food_log_not_found(self, client, auth_user):
        """Test deleting non-existent food log."""
        response = client.delete(
            "/api/food/999999",
            headers=auth_user["headers"],
        )

        assert response.status_code == 404

    def test_delete_other_users_food_log(self, client, auth_user, sample_food_items):
        """Test that user cannot delete another user's food log."""
        # Create a meal with first user
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items}
        )
        meal_id = create_response.json()["id"]

        # Create second user
        unique_id = uuid.uuid4().hex[:8]
        second_user_payload = {
            "email": f"del.{unique_id}@example.com",
            "username": f"deluser_{unique_id}",
            "password": "SecurePass123!",
            "full_name": "Delete Test User",
            "birth_date": date(1990, 1, 1).isoformat(),
            "height_cm": 175,
            "weight_kg": 70,
            "gender": "male",
            "activity_level": "moderate",
            "fitness_goals": [],
            "dietary_preferences": [],
            "allergies": [],
        }
        client.post("/api/users/register", json=second_user_payload)
        login_response = client.post("/api/users/login", json={
            "email": second_user_payload["email"],
            "password": second_user_payload["password"],
        })
        second_token = login_response.json()["access_token"]

        # Try to delete first user's meal with second user's token
        response = client.delete(
            f"/api/food/{meal_id}",
            headers={"Authorization": f"Bearer {second_token}"},
        )

        # Should return 403 forbidden or 404
        assert response.status_code in [403, 404]


class TestMealCorrection:
    """Tests for meal correction endpoint."""

    def test_correct_meal_success(self, client, auth_user, sample_food_items):
        """Test successful meal correction."""
        # Create a meal
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items, "note": "Original meal"}
        )
        meal_id = create_response.json()["id"]

        # Correct the meal
        corrected_items = [
            {
                "name": "Salmon Fillet",
                "calories": 208,
                "protein_grams": 20,
                "carbs_grams": 0,
                "fat_grams": 13,
                "quantity": "100g",
            }
        ]

        response = client.put(
            f"/api/food/{meal_id}/correct",
            headers=auth_user["headers"],
            json={
                "food_log_id": meal_id,
                "food_items": corrected_items,
                "note": "Corrected meal",
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == meal_id
        assert data["is_corrected"] is True
        assert data["note"] == "Corrected meal"
        assert len(data["food_items"]) == 1
        assert data["food_items"][0]["name"] == "Salmon Fillet"

    def test_correct_meal_id_mismatch(self, client, auth_user, sample_food_items):
        """Test meal correction with mismatched IDs."""
        # Create a meal
        create_response = client.post(
            "/api/food/manual",
            headers=auth_user["headers"],
            json={"food_items": sample_food_items}
        )
        meal_id = create_response.json()["id"]

        # Try to correct with mismatched ID
        response = client.put(
            f"/api/food/{meal_id}/correct",
            headers=auth_user["headers"],
            json={
                "food_log_id": meal_id + 1,  # Wrong ID
                "food_items": sample_food_items,
            }
        )

        assert response.status_code == 400
        assert "mismatch" in response.json()["detail"].lower()

    def test_correct_nonexistent_meal(self, client, auth_user, sample_food_items):
        """Test correcting non-existent meal."""
        response = client.put(
            "/api/food/999999/correct",
            headers=auth_user["headers"],
            json={
                "food_log_id": 999999,
                "food_items": sample_food_items,
            }
        )

        assert response.status_code in [404, 500]  # ValueError or not found
