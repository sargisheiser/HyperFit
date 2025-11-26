from datetime import date


def test_register_and_login_roundtrip(client):
    registration_payload = {
        "email": "test.user@example.com",
        "username": "testuser",
        "password": "SuperSecurePassword123!",
        "full_name": "Test User",
        "birth_date": date(1995, 5, 20).isoformat(),
        "height_cm": 180,
        "weight_kg": 80,
        "gender": "other",
        "activity_level": "moderate",
        "fitness_goals": ["endurance", "strength"],
        "dietary_preferences": ["vegetarian"],
        "allergies": ["peanuts"],
    }

    register_response = client.post("/api/users/register", json=registration_payload)
    assert register_response.status_code == 201
    data = register_response.json()
    assert data["email"] == registration_payload["email"]
    assert data["username"] == registration_payload["username"]
    assert data["id"] > 0

    login_payload = {
        "email": registration_payload["email"],
        "password": registration_payload["password"],
    }
    login_response = client.post("/api/users/login", json=login_payload)
    assert login_response.status_code == 200

    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] > 0








