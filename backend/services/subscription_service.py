"""Subscription management service layer."""

import logging
from datetime import UTC, datetime

import stripe
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.subscription import PaymentEvent, Subscription
from backend.models.user import User

logger = logging.getLogger(__name__)

if settings.stripe_api_key:
    stripe.api_key = settings.stripe_api_key


def get_or_create_subscription(user: User, db: Session) -> Subscription:
    """Get user's subscription, creating a free one if none exists."""
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if sub is None:
        sub = Subscription(user_id=user.id, tier="free", status="active")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def get_subscription_status(user: User, db: Session) -> dict:
    """Return the user's subscription status."""
    sub = get_or_create_subscription(user, db)
    return {
        "is_premium": sub.tier == "premium" and sub.status == "active",
        "tier": sub.tier,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
    }


def create_checkout_session(user: User, price_id: str, db: Session) -> dict:
    """Create a Stripe Checkout session for the user."""
    if not settings.stripe_api_key:
        raise ValueError("Stripe is not configured")

    sub = get_or_create_subscription(user, db)

    if not sub.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        sub.stripe_customer_id = customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=sub.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.frontend_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/subscription/cancel",
        metadata={"user_id": str(user.id)},
    )

    return {"checkout_url": session.url, "session_id": session.id}


def cancel_subscription(user: User, db: Session) -> dict:
    """Cancel the user's premium subscription."""
    sub = get_or_create_subscription(user, db)

    if sub.tier == "free" or sub.status != "active":
        raise ValueError("No active premium subscription to cancel")

    if sub.stripe_subscription_id and settings.stripe_api_key:
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )

    sub.status = "canceled"
    sub.canceled_at = datetime.now(UTC)
    db.commit()

    return {"message": "Subscription will be canceled at end of billing period"}


def handle_webhook_event(payload: bytes, sig_header: str, db: Session) -> dict:
    """Process a Stripe webhook event."""
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret not configured")

    event = stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )

    existing = (
        db.query(PaymentEvent)
        .filter(PaymentEvent.stripe_event_id == event["id"])
        .first()
    )
    if existing:
        return {"status": "already_processed"}

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data, db)
    elif event_type == "invoice.payment_succeeded":
        _handle_payment_succeeded(data, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data, db)

    payment_event = PaymentEvent(
        user_id=_get_user_id_from_event(data, db),
        stripe_event_id=event["id"],
        event_type=event_type,
        amount=data.get("amount_total", data.get("amount_paid")),
        status="processed",
    )
    db.add(payment_event)
    db.commit()

    return {"status": "processed"}


def _handle_checkout_completed(data: dict, db: Session) -> None:
    """Activate subscription after successful checkout."""
    user_id = data.get("metadata", {}).get("user_id")
    if not user_id:
        logger.warning("Checkout completed without user_id in metadata")
        return

    sub = db.query(Subscription).filter(Subscription.user_id == int(user_id)).first()
    if sub:
        sub.tier = "premium"
        sub.status = "active"
        sub.stripe_subscription_id = data.get("subscription")
        db.commit()


def _handle_payment_succeeded(data: dict, db: Session) -> None:
    """Update subscription period after successful payment."""
    stripe_sub_id = data.get("subscription")
    if not stripe_sub_id:
        return

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if sub:
        sub.status = "active"
        period = data.get("lines", {}).get("data", [{}])[0].get("period", {})
        if period.get("start"):
            sub.current_period_start = datetime.fromtimestamp(
                period["start"], tz=UTC
            )
        if period.get("end"):
            sub.current_period_end = datetime.fromtimestamp(
                period["end"], tz=UTC
            )
        db.commit()


def _handle_subscription_deleted(data: dict, db: Session) -> None:
    """Downgrade user when subscription is deleted."""
    stripe_sub_id = data.get("id")
    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if sub:
        sub.tier = "free"
        sub.status = "canceled"
        sub.canceled_at = datetime.now(UTC)
        db.commit()


def _get_user_id_from_event(data: dict, db: Session) -> int | None:
    """Extract user_id from Stripe event data."""
    user_id = data.get("metadata", {}).get("user_id")
    if user_id:
        return int(user_id)

    customer_id = data.get("customer")
    if customer_id:
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_customer_id == customer_id)
            .first()
        )
        if sub:
            return sub.user_id

    return None
