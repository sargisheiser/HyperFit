"""Comprehensive tests for workout API endpoints."""

from datetime import date, datetime
import pytest
import uuid


@pytest.fixture
def auth_user(client):
    """Create and authenticate a user, return headers with token."""
    unique_id = uuid.uuid4().hex[:8]
    user_payload = {
        "email": f"workout.test.{unique_id}@example.com",
        "username": f"workoutuser_{unique_id}",
        "password": "SecurePass123!",
        "full_name": "Workout Test User",
        "birth_date": date(1990, 1, 1).isoformat(),
        "height_cm": 180,
        "weight_kg": 80,
        "gender": "male",
        "activity_level": "active",
        "fitness_goals": ["strength", "endurance"],
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
        "token": token,
    }


@pytest.fixture
def sample_workout_data():
    """Sample workout data for creating history entries."""
    return {
        "name": "Morning Strength Session",
        "exercise": "push-up",
        "workout_type": "strength",
        "duration_seconds": 1800,  # 30 minutes
        "reps": 30,
        "calories_burned": 150.5,
        "feedback": ["Good form", "Keep it up"],
        "notes": "Morning workout session",
    }


class TestWorkoutHistory:
    """Tests for workout history endpoints."""

    def test_get_history_empty(self, client, auth_user):
        """Test getting history when user has no workouts."""
        response = client.get(
            "/api/workouts/history",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_create_workout_history(self, client, auth_user, sample_workout_data):
        """Test creating a workout history entry."""
        response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=sample_workout_data,
        )

        assert response.status_code == 201
        data = response.json()

        assert data["id"] > 0
        assert data["workout_type"] == sample_workout_data["workout_type"]
        assert data["duration_minutes"] == 30  # 1800 seconds = 30 minutes
        assert data["calories_burned"] == sample_workout_data["calories_burned"]
        assert "created_at" in data
        assert len(data["exercises"]) >= 0  # May have exercises

    def test_get_history_with_workouts(self, client, auth_user, sample_workout_data):
        """Test getting history after creating workouts."""
        # Create two workouts
        for i in range(2):
            workout_data = sample_workout_data.copy()
            workout_data["notes"] = f"Workout {i+1}"
            client.post(
                "/api/workouts/history",
                headers=auth_user["headers"],
                json=workout_data,
            )

        response = client.get(
            "/api/workouts/history",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Verify both workouts are present (order may vary due to timestamp resolution)
        notes = {d["ai_metadata"]["notes"] for d in data}
        assert notes == {"Workout 1", "Workout 2"}

    def test_get_history_unauthenticated(self, client):
        """Test getting history without authentication."""
        response = client.get("/api/workouts/history")
        assert response.status_code == 401

    def test_create_workout_unauthenticated(self, client, sample_workout_data):
        """Test creating workout without authentication."""
        response = client.post(
            "/api/workouts/history",
            json=sample_workout_data,
        )
        assert response.status_code == 401


class TestGetWorkout:
    """Tests for getting individual workout."""

    def test_get_workout_success(self, client, auth_user, sample_workout_data):
        """Test getting a specific workout."""
        # Create a workout
        create_response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=sample_workout_data,
        )
        workout_id = create_response.json()["id"]

        # Get the workout
        response = client.get(
            f"/api/workouts/history/{workout_id}",
            headers=auth_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == workout_id
        assert data["workout_type"] == sample_workout_data["workout_type"]

    def test_get_workout_not_found(self, client, auth_user):
        """Test getting non-existent workout."""
        response = client.get(
            "/api/workouts/history/999999",
            headers=auth_user["headers"],
        )

        assert response.status_code == 404

    def test_get_other_users_workout(self, client, auth_user, sample_workout_data):
        """Test that user cannot get another user's workout."""
        # Create a workout with first user
        create_response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=sample_workout_data,
        )
        workout_id = create_response.json()["id"]

        # Create second user
        unique_id = uuid.uuid4().hex[:8]
        second_user_payload = {
            "email": f"other.workout.{unique_id}@example.com",
            "username": f"otherworkout_{unique_id}",
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

        # Try to get first user's workout with second user's token
        response = client.get(
            f"/api/workouts/history/{workout_id}",
            headers={"Authorization": f"Bearer {second_token}"},
        )

        # Should return 404 (not found for this user)
        assert response.status_code == 404


class TestWorkoutDataValidation:
    """Tests for workout data validation."""

    def test_create_workout_minimal_data(self, client, auth_user):
        """Test creating workout with minimal required data."""
        minimal_data = {
            "workout_type": "cardio",
            "duration_seconds": 600,
        }

        response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=minimal_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["workout_type"] == "cardio"
        assert data["duration_minutes"] == 10  # 600 seconds = 10 minutes

    def test_create_workout_with_exercise(self, client, auth_user):
        """Test creating workout with exercise details."""
        workout_data = {
            "name": "Full Body Session",
            "exercise": "push-up",
            "workout_type": "full-body",
            "duration_seconds": 3600,
            "reps": 50,
            "calories_burned": 450.0,
            "feedback": ["Good form"],
            "notes": "Full body workout",
        }

        response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=workout_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["workout_type"] == "full-body"
        assert data["duration_minutes"] == 60  # 3600 seconds = 60 minutes
        assert len(data["exercises"]) == 1  # One exercise entry

    def test_create_workout_high_intensity(self, client, auth_user):
        """Test creating high intensity workout."""
        workout_data = {
            "exercise": "jumping-jack",
            "workout_type": "hiit",
            "duration_seconds": 1200,
            "reps": 100,
            "calories_burned": 300.0,
            "notes": "High intensity interval training",
        }

        response = client.post(
            "/api/workouts/history",
            headers=auth_user["headers"],
            json=workout_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["workout_type"] == "hiit"
        assert data["calories_burned"] == 300.0


class TestWorkoutIsolation:
    """Tests for user data isolation."""

    def test_users_see_only_their_workouts(self, client, sample_workout_data):
        """Test that users can only see their own workouts."""
        # Create first user and workout
        unique_id1 = uuid.uuid4().hex[:8]
        user1_payload = {
            "email": f"iso1.{unique_id1}@example.com",
            "username": f"isouser1_{unique_id1}",
            "password": "SecurePass123!",
            "full_name": "User One",
            "birth_date": date(1990, 1, 1).isoformat(),
            "height_cm": 180,
            "weight_kg": 80,
            "gender": "male",
            "activity_level": "active",
            "fitness_goals": [],
            "dietary_preferences": [],
            "allergies": [],
        }
        client.post("/api/users/register", json=user1_payload)
        login1 = client.post("/api/users/login", json={
            "email": user1_payload["email"],
            "password": user1_payload["password"],
        })
        token1 = login1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Create workout for user 1
        workout1_data = sample_workout_data.copy()
        workout1_data["notes"] = "User 1 workout"
        client.post("/api/workouts/history", headers=headers1, json=workout1_data)

        # Create second user and workout
        unique_id2 = uuid.uuid4().hex[:8]
        user2_payload = {
            "email": f"iso2.{unique_id2}@example.com",
            "username": f"isouser2_{unique_id2}",
            "password": "SecurePass123!",
            "full_name": "User Two",
            "birth_date": date(1990, 1, 1).isoformat(),
            "height_cm": 170,
            "weight_kg": 65,
            "gender": "female",
            "activity_level": "moderate",
            "fitness_goals": [],
            "dietary_preferences": [],
            "allergies": [],
        }
        client.post("/api/users/register", json=user2_payload)
        login2 = client.post("/api/users/login", json={
            "email": user2_payload["email"],
            "password": user2_payload["password"],
        })
        token2 = login2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create workout for user 2
        workout2_data = sample_workout_data.copy()
        workout2_data["notes"] = "User 2 workout"
        client.post("/api/workouts/history", headers=headers2, json=workout2_data)

        # User 1 should only see their workout
        response1 = client.get("/api/workouts/history", headers=headers1)
        data1 = response1.json()
        assert len(data1) == 1
        assert data1[0]["ai_metadata"]["notes"] == "User 1 workout"

        # User 2 should only see their workout
        response2 = client.get("/api/workouts/history", headers=headers2)
        data2 = response2.json()
        assert len(data2) == 1
        assert data2[0]["ai_metadata"]["notes"] == "User 2 workout"
