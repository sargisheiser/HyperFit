"""Tests for subscription models and endpoints."""

import uuid
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch


def create_test_user(client, email_prefix="sub"):
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


def register_and_login(client, payload):
    reg = client.post("/api/users/register", json=payload)
    assert reg.status_code == 201
    login = client.post("/api/users/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"token": token, "headers": {"Authorization": f"Bearer {token}"}}


class TestSubscriptionModels:
    def test_create_subscription_record(self, db_session):
        from backend.models.subscription import Subscription
        sub = Subscription(
            user_id=1, tier="premium", status="active",
            stripe_customer_id="cus_test123", stripe_subscription_id="sub_test123",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
        )
        db_session.add(sub)
        db_session.commit()
        db_session.refresh(sub)
        assert sub.id is not None
        assert sub.tier == "premium"
        assert sub.stripe_customer_id == "cus_test123"

    def test_subscription_default_tier_is_free(self, db_session):
        from backend.models.subscription import Subscription
        sub = Subscription(user_id=2)
        db_session.add(sub)
        db_session.commit()
        db_session.refresh(sub)
        assert sub.tier == "free"
        assert sub.status == "active"

    def test_payment_event_creation(self, db_session):
        from backend.models.subscription import PaymentEvent
        event = PaymentEvent(
            user_id=1, stripe_event_id="evt_test123",
            event_type="checkout.session.completed",
            amount=9.99, currency="eur", status="processed",
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)
        assert event.id is not None
        assert event.stripe_event_id == "evt_test123"


class TestSubscriptionEndpoints:
    def test_get_subscription_unauthenticated(self, client):
        response = client.get("/api/subscriptions/me")
        assert response.status_code == 401

    def test_get_subscription_free_user(self, client):
        payload = create_test_user(client, "free")
        auth = register_and_login(client, payload)
        response = client.get("/api/subscriptions/me", headers=auth["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "free"
        assert data["is_premium"] is False

    @patch("backend.services.subscription_service.settings")
    @patch("backend.services.subscription_service.stripe")
    def test_create_checkout_session(self, mock_stripe, mock_settings, client):
        mock_settings.stripe_api_key = "sk_test_fake"
        mock_settings.frontend_url = "http://localhost:3000"
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_test_456")
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/test",
            id="cs_test_123",
        )
        payload = create_test_user(client, "checkout")
        auth = register_and_login(client, payload)
        response = client.post(
            "/api/subscriptions/checkout",
            json={"price_id": "price_test_monthly"},
            headers=auth["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["checkout_url"] == "https://checkout.stripe.com/test"
        assert data["session_id"] == "cs_test_123"

    def test_cancel_subscription_free_user(self, client):
        payload = create_test_user(client, "cancel")
        auth = register_and_login(client, payload)
        response = client.post("/api/subscriptions/cancel", headers=auth["headers"])
        assert response.status_code == 400
