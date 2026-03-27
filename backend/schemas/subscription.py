"""Pydantic schemas for subscription endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    tier: str
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateCheckoutRequest(BaseModel):
    price_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class SubscriptionStatusResponse(BaseModel):
    is_premium: bool
    tier: str
    status: str
    current_period_end: Optional[datetime] = None
