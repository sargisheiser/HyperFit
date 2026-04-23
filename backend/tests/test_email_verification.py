"""Tests for email verification flow (TDD)."""

import uuid
from datetime import date
from unittest.mock import patch


def create_test_user(client, email_prefix="verify"):
    unique_id = uuid.uuid4().hex[:8]
    return {
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


class TestEmailVerification:
    @patch("backend.services.email_service.send_verification_email")
    def test_register_triggers_verification_email(self, mock_send, client):
        """Registration should trigger a verification email."""
        mock_send.return_value = True
        payload = create_test_user(client, "reg")
        response = client.post("/api/users/register", json=payload)
        assert response.status_code == 201
        # Verification email should be sent
        mock_send.assert_called_once()

    def test_verify_email_with_valid_token(self, client, db_session):
        """Valid verification token should mark user as verified."""
        # Register a user
        payload = create_test_user(client, "valid")
        reg = client.post("/api/users/register", json=payload)
        assert reg.status_code == 201
        user_id = reg.json()["id"]

        # Set a verification token manually
        from backend.models.user import User

        user = db_session.query(User).filter(User.id == user_id).first()
        user.verification_token = "test-token-123"
        db_session.commit()

        # Verify the email
        response = client.get("/api/users/verify-email?token=test-token-123")
        assert response.status_code == 200
        assert response.json()["verified"] is True

        # User should now be verified
        db_session.refresh(user)
        assert user.is_verified is True
        assert user.verification_token is None

    def test_verify_email_with_invalid_token(self, client):
        """Invalid token should return 400."""
        response = client.get("/api/users/verify-email?token=invalid-token")
        assert response.status_code == 400

    def test_verify_email_without_token(self, client):
        """Missing token should return 422."""
        response = client.get("/api/users/verify-email")
        assert response.status_code == 422
