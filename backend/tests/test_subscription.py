"""Tests for subscription models and endpoints."""

import uuid
from datetime import date, datetime, timezone


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
