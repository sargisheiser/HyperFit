"""Comprehensive authentication tests."""

from datetime import date
import uuid


def create_test_user(client, email_prefix="test"):
    """Helper to create and register a test user."""
    unique_id = uuid.uuid4().hex[:8]
    payload = {
        "email": f"{email_prefix}.{unique_id}@example.com",
        "username": f"user_{unique_id}",
        "password": "SecurePass123!",
        "full_name": "Test User",
        "birth_date": date(1990, 6, 15).isoformat(),
        "height_cm": 175,
        "weight_kg": 70,
        "gender": "male",
        "activity_level": "active",
        "fitness_goals": ["strength"],
        "dietary_preferences": [],
        "allergies": [],
    }
    return payload


def register_and_login(client, payload):
    """Helper to register a user and get auth token."""
    reg_response = client.post("/api/users/register", json=payload)
    assert reg_response.status_code == 201
    user_data = reg_response.json()

    login_response = client.post("/api/users/login", json={
        "email": payload["email"],
        "password": payload["password"],
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    return {
        "user": user_data,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "email": payload["email"],
        "password": payload["password"],
    }


class TestUserRegistration:
    """Tests for user registration endpoint."""

    def test_register_success(self, client):
        """Test successful user registration."""
        payload = create_test_user(client, "reg")

        response = client.post("/api/users/register", json=payload)
        assert response.status_code == 201
        data = response.json()

        assert data["email"] == payload["email"]
        assert data["username"] == payload["username"]
        assert data["full_name"] == payload["full_name"]
        assert "id" in data
        assert data["id"] > 0
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client):
        """Test registration fails with duplicate email."""
        payload1 = create_test_user(client, "dup")
        client.post("/api/users/register", json=payload1)

        payload2 = create_test_user(client, "dup2")
        payload2["email"] = payload1["email"]  # Same email

        response = client.post("/api/users/register", json=payload2)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_duplicate_username(self, client):
        """Test registration fails with duplicate username."""
        payload1 = create_test_user(client, "dupuser")
        client.post("/api/users/register", json=payload1)

        payload2 = create_test_user(client, "dupuser2")
        payload2["username"] = payload1["username"]  # Same username

        response = client.post("/api/users/register", json=payload2)
        assert response.status_code == 400
        assert "username" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """Test registration fails with invalid email format."""
        payload = create_test_user(client)
        payload["email"] = "not-an-email"

        response = client.post("/api/users/register", json=payload)
        assert response.status_code == 422

    def test_register_missing_required_fields(self, client):
        """Test registration fails with missing required fields."""
        response = client.post("/api/users/register", json={
            "email": "test@example.com",
        })
        assert response.status_code == 422


class TestUserLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, client):
        """Test successful login."""
        payload = create_test_user(client, "login")
        client.post("/api/users/register", json=payload)

        response = client.post("/api/users/login", json={
            "email": payload["email"],
            "password": payload["password"],
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_login_wrong_password(self, client):
        """Test login fails with wrong password."""
        payload = create_test_user(client, "wrongpw")
        client.post("/api/users/register", json=payload)

        response = client.post("/api/users/login", json={
            "email": payload["email"],
            "password": "WrongPassword123!",
        })

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """Test login fails for non-existent user."""
        response = client.post("/api/users/login", json={
            "email": "nonexistent@example.com",
            "password": "SomePassword123!",
        })

        assert response.status_code == 401

    def test_login_empty_password(self, client):
        """Test login fails with empty password."""
        payload = create_test_user(client, "empty")
        client.post("/api/users/register", json=payload)

        response = client.post("/api/users/login", json={
            "email": payload["email"],
            "password": "",
        })

        assert response.status_code in [400, 401, 422]


class TestUserProfile:
    """Tests for user profile endpoints."""

    def test_get_profile_authenticated(self, client):
        """Test getting profile when authenticated."""
        payload = create_test_user(client, "profile")
        auth = register_and_login(client, payload)

        response = client.get("/api/users/me", headers=auth["headers"])

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == auth["email"]
        assert data["id"] == auth["user"]["id"]

    def test_get_profile_unauthenticated(self, client):
        """Test getting profile without authentication fails."""
        response = client.get("/api/users/me")
        assert response.status_code == 401

    def test_get_profile_invalid_token(self, client):
        """Test getting profile with invalid token fails."""
        response = client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401

    def test_update_profile(self, client):
        """Test updating user profile."""
        payload = create_test_user(client, "update")
        auth = register_and_login(client, payload)

        response = client.put(
            "/api/users/me",
            headers=auth["headers"],
            json={
                "full_name": "Updated Name",
                "weight_kg": 75,
                "height_cm": 180,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["weight_kg"] == 75
        assert data["height_cm"] == 180

    def test_update_profile_partial(self, client):
        """Test partial profile update (only some fields)."""
        payload = create_test_user(client, "partial")
        auth = register_and_login(client, payload)

        response = client.put(
            "/api/users/me",
            headers=auth["headers"],
            json={"weight_kg": 72}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["weight_kg"] == 72
        assert data["full_name"] == payload["full_name"]


class TestPasswordReset:
    """Tests for password reset endpoints."""

    def test_forgot_password_existing_user(self, client):
        """Test password reset request for existing user."""
        payload = create_test_user(client, "forgot")
        client.post("/api/users/register", json=payload)

        response = client.post("/api/users/forgot-password", json={
            "email": payload["email"]
        })

        assert response.status_code == 200
        assert "message" in response.json()

    def test_forgot_password_nonexistent_user(self, client):
        """Test password reset request for non-existent user."""
        response = client.post("/api/users/forgot-password", json={
            "email": "nonexistent@example.com"
        })

        assert response.status_code == 200
        assert "message" in response.json()

    def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = client.post("/api/users/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "NewSecurePass123!"
        })

        assert response.status_code == 400
