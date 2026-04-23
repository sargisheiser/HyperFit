"""Tests for welcome email sent after registration (TDD)."""

import uuid
from datetime import date
from unittest.mock import patch


def create_test_user(email_prefix="welcome"):
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"{email_prefix}.{unique_id}@example.com",
        "username": f"user_{unique_id}",
        "password": "SecurePass123!",
        "full_name": "Welcome Tester",
        "birth_date": date(1990, 6, 15).isoformat(),
        "height_cm": 175,
        "weight_kg": 70,
        "gender": "male",
        "activity_level": "active",
        "fitness_goals": ["strength"],
        "dietary_preferences": [],
        "allergies": [],
    }


class TestWelcomeEmail:
    @patch("backend.services.email_service.send_welcome_email")
    @patch("backend.services.email_service.send_verification_email")
    def test_register_triggers_welcome_email(self, mock_verify, mock_welcome, client):
        """Registration should trigger a welcome email alongside the verification email."""
        mock_verify.return_value = True
        mock_welcome.return_value = True

        payload = create_test_user("reg")
        response = client.post("/api/users/register", json=payload)

        assert response.status_code == 201
        mock_welcome.assert_called_once()

        args, kwargs = mock_welcome.call_args
        called_with = list(args) + list(kwargs.values())
        assert payload["email"] in called_with
        assert payload["full_name"] in called_with

    @patch("backend.services.email_service.send_welcome_email")
    @patch("backend.services.email_service.send_verification_email")
    def test_registration_succeeds_when_welcome_email_fails(
        self, mock_verify, mock_welcome, client
    ):
        """Registration must not fail if the welcome email backend raises."""
        mock_verify.return_value = True
        mock_welcome.side_effect = RuntimeError("SMTP unavailable")

        payload = create_test_user("fail")
        response = client.post("/api/users/register", json=payload)

        assert response.status_code == 201
        mock_welcome.assert_called_once()
