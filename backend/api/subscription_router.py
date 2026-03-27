"""Subscription management endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.core.rate_limit import limiter
from backend.models.user import User
from backend.schemas.subscription import (
    CheckoutResponse,
    CreateCheckoutRequest,
    SubscriptionStatusResponse,
)
import backend.services.subscription_service as subscription_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=SubscriptionStatusResponse)
def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> SubscriptionStatusResponse:
    """Get the current user's subscription status."""
    status_data = subscription_service.get_subscription_status(current_user, db)
    return SubscriptionStatusResponse(**status_data)


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("5/minute")
def create_checkout(
    request: Request,
    payload: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> CheckoutResponse:
    """Create a Stripe Checkout session for subscription upgrade."""
    try:
        result = subscription_service.create_checkout_session(
            current_user, payload.price_id, db
        )
        return CheckoutResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )


@router.post("/cancel")
@limiter.limit("3/minute")
def cancel_subscription(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Cancel the current user's premium subscription."""
    try:
        return subscription_service.cancel_subscription(current_user, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db_session)):
    """Handle Stripe webhook events. No auth — uses Stripe signature."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = subscription_service.handle_webhook_event(payload, sig_header, db)
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    except Exception as exc:
        logger.error("Stripe webhook error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook processing failed",
        )
