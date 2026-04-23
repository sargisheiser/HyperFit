from datetime import date

import pytest


@pytest.fixture()
def user_payload():
    return {
        "email": "nutrition.user@example.com",
        "username": "nutritester",
        "password": "SecurePass123!",
        "full_name": "Nutrition Tester",
        "birth_date": date(1990, 1, 1).isoformat(),
        "height_cm": 180,
        "weight_kg": 80,
        "gender": "other",
        "activity_level": "moderate",
        "fitness_goals": ["strength"],
        "dietary_preferences": ["vegan"],
        "allergies": [],
    }


def test_nutrition_endpoints_roundtrip(client, user_payload):
    """Test basic nutrition endpoint functionality."""
    register = client.post("/api/users/register", json=user_payload)
    assert register.status_code == 201
    user_id = register.json()["id"]

    # Login to get auth token
    login = client.post(
        "/api/users/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test update endpoint accepts and returns data
    update_payload = {
        "user_id": user_id,
        "calories_goal": 2500,
        "calories_consumed": 2300,
        "weight": 82.0,
    }
    update_response = client.post("/api/nutrition/update", json=update_payload, headers=headers)
    assert update_response.status_code == 200
    update_data = update_response.json()
    assert "calories_goal" in update_data

    # Test daily endpoint
    daily_response = client.get(f"/api/nutrition/daily/{user_id}", headers=headers)
    assert daily_response.status_code == 200
    daily_data = daily_response.json()
    assert daily_data["calories_goal"] == 2500

    # Test add meal endpoint
    meal_payload = {
        "user_id": user_id,
        "calories": 600,
        "protein": 45,
        "carbs": 55,
        "fat": 18,
        "note": "Integration test meal",
        "image_url": "/uploads/test-meal.jpg",
    }
    meal_response = client.post("/api/nutrition/meals/add", json=meal_payload, headers=headers)
    assert meal_response.status_code == 200
    meal_data = meal_response.json()
    assert meal_data["status"] == "saved"
    assert meal_data["meal"]["calories"] == pytest.approx(600.0)

    # Test meal history endpoint
    history_response = client.get(f"/api/nutrition/meals/history?user_id={user_id}", headers=headers)
    assert history_response.status_code == 200
    history = history_response.json()
    assert history["user_id"] == user_id
    assert len(history["meals"]) >= 1

    # Test weight logging endpoint
    weight_response = client.post(
        "/api/nutrition/weight", json={"user_id": user_id, "weight": 81.5}, headers=headers
    )
    assert weight_response.status_code == 200
    weight_data = weight_response.json()
    assert weight_data["weight"] == 81.5

    # Test checkin endpoint
    checkin_payload = {
        "user_id": user_id,
        "goal": "lose",
        "body_fat": 22.0,
        "calories_previous": 2500,
        "calories_new": 2300,
        "compliance": 85.0,
    }
    checkin_response = client.post("/api/nutrition/checkin", json=checkin_payload, headers=headers)
    assert checkin_response.status_code == 200
    checkin_data = checkin_response.json()
    assert checkin_data["goal"] == "lose"

    # Test AI optimize endpoint returns valid response
    ai_response = client.get(f"/api/nutrition/ai_optimize?user_id={user_id}", headers=headers)
    assert ai_response.status_code == 200
    ai_data = ai_response.json()
    assert "recommended_calories" in ai_data

    # Test recipe suggestions endpoint
    recipe_response = client.get(f"/api/nutrition/recipes?user_id={user_id}", headers=headers)
    assert recipe_response.status_code == 200
    recipes = recipe_response.json()["suggestions"]
    assert len(recipes) >= 1

    # Test that unauthenticated access is blocked
    unauth_response = client.get(f"/api/nutrition/daily/{user_id}")
    assert unauth_response.status_code == 401

