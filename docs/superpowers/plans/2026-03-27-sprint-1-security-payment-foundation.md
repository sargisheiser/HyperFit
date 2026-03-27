# Sprint 1: Security + Payment Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish CI quality gates (ruff, mypy, bandit), replace all console.log calls with a logging utility, and build Stripe subscription backend.

**Architecture:** Two parallel tracks executed sequentially within the sprint. Quality track (Tasks 1-3) hardens CI and frontend logging. Feature track (Tasks 4-8) adds Stripe payment models, service, router, and tests. Both tracks are independent and can be worked in any order.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Stripe Python SDK, pytest, ruff, mypy, bandit, Vite/React 18, Zustand, ESLint

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/utils/logger.js` | Logging utility replacing all console.* calls |
| `backend/models/subscription.py` | Subscription, SubscriptionPlan SQLAlchemy models |
| `backend/schemas/subscription.py` | Pydantic request/response schemas for subscription endpoints |
| `backend/services/subscription_service.py` | Stripe API integration + subscription CRUD |
| `backend/api/subscription_router.py` | REST endpoints for subscription management |
| `backend/tests/test_subscription.py` | Tests for subscription endpoints |
| `pyproject.toml` | ruff + mypy configuration (if not exists, add sections) |

### Modified Files
| File | Change |
|------|--------|
| `.github/workflows/backend-ci.yml` | Add ruff, mypy, bandit steps |
| `requirements.txt` | Add stripe, ruff, bandit |
| `backend/core/config.py` | Add Stripe settings |
| `backend/api/__init__.py` | Register subscription router |
| `backend/models/user.py` | Add subscription relationship to User |
| `env.example` | Add Stripe placeholder vars |
| `frontend/.env.example` | Add VITE_STRIPE_PUBLISHABLE_KEY |
| ~34 frontend files | Replace console.* with logger.* |

---

## Task 1: Create Frontend Logger Utility

**Files:**
- Create: `frontend/src/utils/logger.js`

- [ ] **Step 1: Create the logger utility**

```javascript
// frontend/src/utils/logger.js

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

const CURRENT_LEVEL = import.meta.env.PROD ? LOG_LEVELS.warn : LOG_LEVELS.debug

const logger = {
  debug(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) {
      console.debug('[HYPERFIT]', ...args)
    }
  },

  info(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) {
      console.info('[HYPERFIT]', ...args)
    }
  },

  warn(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) {
      console.warn('[HYPERFIT]', ...args)
    }
  },

  error(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) {
      console.error('[HYPERFIT]', ...args)
    }
  },
}

export default logger
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/logger.js
git commit -m "feat: add frontend logger utility with log levels"
```

---

## Task 2: Replace All console.* Calls With Logger

**Files:**
- Modify: All ~34 frontend files containing console.log/warn/error calls
- Modify: `frontend/.eslintrc.cjs` or ESLint config

The replacement rules:
- `console.log(...)` -> `logger.debug(...)` (general debug output)
- `console.warn(...)` -> `logger.warn(...)`
- `console.error(...)` -> `logger.error(...)`
- `console.info(...)` -> `logger.info(...)`

Each file needs `import logger from '../utils/logger'` (adjust relative path).

- [ ] **Step 1: Replace console calls in store files**

Files to modify:
- `frontend/src/store/userStore.js` (1 call)
- `frontend/src/store/useNutritionStore.js` (3 calls)

For each file, add the import at top and replace calls. Example for `userStore.js`:

```javascript
// Add at top of file
import logger from '../utils/logger'

// Replace: console.error('...', error)
// With:    logger.error('...', error)
```

- [ ] **Step 2: Replace console calls in services**

Files to modify:
- `frontend/src/services/api.js` (1 call)
- `frontend/src/services/nutritionService.js` (6 calls)

- [ ] **Step 3: Replace console calls in hooks**

Files to modify:
- `frontend/src/hooks/useNutritionRecipes.js` (1 call)
- `frontend/src/hooks/useNutritionData.js` (1 call)
- `frontend/src/hooks/useCalories.js` (1 call)
- `frontend/src/hooks/useMeals.js` (3 calls)
- `frontend/src/hooks/useWebSocket.js` (2 calls)
- `frontend/src/hooks/useWorkouts.js` (2 calls)
- `frontend/src/hooks/useSteps.js` (2 calls)

- [ ] **Step 4: Replace console calls in components**

Files to modify:
- `frontend/src/components/CameraCapture.jsx` (1 call)
- `frontend/src/components/LiveWorkout.jsx` (3 calls)
- `frontend/src/components/ErrorBoundary.jsx` (1 call)
- `frontend/src/components/FoodRecognitionCamera.jsx` (2 calls)
- `frontend/src/components/Nutrition/WeightInput.jsx` (2 calls)
- `frontend/src/components/Nutrition/CheckInFlow.jsx` (2 calls)
- `frontend/src/components/Nutrition/ManualMealEntry.jsx` (2 calls)
- `frontend/src/components/Nutrition/AnalysisCorrection.jsx` (3 calls)
- `frontend/src/components/Nutrition/MealHistory.jsx` (4 calls)
- `frontend/src/components/Nutrition/NutritionDashboard.jsx` (2 calls)
- `frontend/src/components/Nutrition/HyperFitVisionModal.jsx` (2 calls)

- [ ] **Step 5: Replace console calls in pages**

Files to modify:
- `frontend/src/pages/MealAnalyzer.jsx` (28 calls -- highest count)
- `frontend/src/pages/WorkoutTracker.jsx` (3 calls)
- `frontend/src/pages/Onboarding.jsx` (1 call)
- `frontend/src/pages/Chat.jsx` (2 calls)
- `frontend/src/pages/Profile.jsx` (3 calls)
- `frontend/src/pages/Workouts.jsx` (3 calls)

- [ ] **Step 6: Replace console calls in contexts**

Files to modify:
- `frontend/src/contexts/AuthContext.jsx` (1 call)

- [ ] **Step 7: Add ESLint no-console rule**

Modify ESLint config (find the config file first -- likely `.eslintrc.cjs` or `eslint.config.js` in `frontend/`):

```javascript
// Add to rules:
'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }]
```

This prevents future `console.log` usage while allowing the console methods that `logger.js` wraps internally.

- [ ] **Step 8: Run lint to verify no violations**

```bash
cd frontend && npm run lint
```

Expected: PASS with zero warnings (max-warnings=0 is already enforced)

- [ ] **Step 9: Run existing frontend tests**

```bash
cd frontend && npm run test -- --run
```

Expected: All existing tests pass.

- [ ] **Step 10: Commit**

```bash
cd frontend
git add -A
git commit -m "refactor: replace all console.* calls with logger utility"
```

---

## Task 3: Add ruff, mypy, bandit to Backend CI

**Files:**
- Modify: `.github/workflows/backend-ci.yml`
- Modify: `requirements.txt`
- Create or Modify: `pyproject.toml` (ruff + mypy config)

- [ ] **Step 1: Add ruff and bandit to requirements.txt**

Append to `requirements.txt`:

```
# Code Quality (CI)
ruff>=0.4.0
bandit>=1.7.8
```

Note: mypy==1.10.0 is already in requirements.txt.

- [ ] **Step 2: Create ruff and mypy config in pyproject.toml**

Check if `pyproject.toml` exists at project root. If not, create it. Add these sections:

```toml
[tool.ruff]
target-version = "py311"
line-length = 120
src = ["backend", "ai_modules"]

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM"]
ignore = ["E501"]  # line length handled by line-length setting

[tool.ruff.lint.per-file-ignores]
"backend/tests/*" = ["B", "SIM"]
"alembic/*" = ["E", "F", "W", "I", "N", "UP", "B", "SIM"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
ignore_missing_imports = true
exclude = ["alembic/", "tests/"]

[tool.bandit]
exclude_dirs = ["backend/tests", "alembic"]
skips = ["B101"]  # allow assert in tests
```

- [ ] **Step 3: Run ruff locally to check for issues**

```bash
ruff check backend/ ai_modules/
```

Fix any auto-fixable issues:

```bash
ruff check backend/ ai_modules/ --fix
```

- [ ] **Step 4: Run mypy locally**

```bash
mypy backend/ --ignore-missing-imports --exclude 'tests|alembic'
```

Fix any critical type errors. Ignore warnings from third-party stubs.

- [ ] **Step 5: Run bandit locally**

```bash
bandit -r backend/ -c pyproject.toml
```

Review findings. Fix CRITICAL and HIGH severity issues.

- [ ] **Step 6: Update backend CI workflow**

Replace the content of `.github/workflows/backend-ci.yml` with:

```yaml
name: Backend CI

on:
  push:
    paths:
      - 'backend/**'
      - 'ai_modules/**'
      - 'requirements*.txt'
      - 'pyproject.toml'
  pull_request:
    paths:
      - 'backend/**'
      - 'ai_modules/**'
      - 'requirements*.txt'
      - 'pyproject.toml'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: pip install ruff mypy bandit
      - name: Ruff lint
        run: ruff check backend/ ai_modules/
      - name: Mypy type check
        run: mypy backend/ --ignore-missing-imports --exclude 'tests|alembic'
      - name: Bandit security scan
        run: bandit -r backend/ -c pyproject.toml

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: pip install -r requirements.txt && pip install pytest pytest-cov
      - name: Run tests
        env:
          TESTING: 'true'
          DATABASE_URL: 'sqlite:///./test.db'
          SECRET_KEY: 'test-secret-key-for-ci-minimum-32-chars!'
        run: pytest backend/tests/ -v --tb=short --cov=backend --cov-report=term-missing
```

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/backend-ci.yml requirements.txt pyproject.toml
git commit -m "ci: add ruff linting, mypy type checking, bandit security scanning to backend CI"
```

---

## Task 4: Add Stripe Config to Settings

**Files:**
- Modify: `backend/core/config.py`
- Modify: `env.example`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Add Stripe settings to config.py**

Add these fields to the `Settings` class in `backend/core/config.py`, after the existing SMTP section:

```python
    # Stripe
    stripe_api_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_yearly: Optional[str] = None
```

- [ ] **Step 2: Update env.example**

Append to `env.example`:

```
# Stripe
STRIPE_API_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_MONTHLY=price_monthly_id
STRIPE_PRICE_ID_YEARLY=price_yearly_id
```

- [ ] **Step 3: Update frontend/.env.example**

Append to `frontend/.env.example`:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

- [ ] **Step 4: Commit**

```bash
git add backend/core/config.py env.example frontend/.env.example
git commit -m "feat: add Stripe configuration settings"
```

---

## Task 5: Create Subscription Models

**Files:**
- Create: `backend/models/subscription.py`
- Modify: `backend/models/user.py`

- [ ] **Step 1: Write the failing test for models**

Create test file `backend/tests/test_subscription.py`:

```python
"""Tests for subscription models and endpoints."""

import uuid
from datetime import date, datetime, timezone

def create_test_user(client, email_prefix="sub"):
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

    login_response = client.post(
        "/api/users/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    return {
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


class TestSubscriptionModels:
    """Tests for subscription model creation."""

    def test_create_subscription_record(self, db_session):
        """Test that a Subscription record can be created in the database."""
        from backend.models.subscription import Subscription

        sub = Subscription(
            user_id=1,
            tier="premium",
            status="active",
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_test123",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
        )
        db_session.add(sub)
        db_session.commit()
        db_session.refresh(sub)

        assert sub.id is not None
        assert sub.tier == "premium"
        assert sub.status == "active"
        assert sub.stripe_customer_id == "cus_test123"

    def test_subscription_default_tier_is_free(self, db_session):
        """Test that default tier is free."""
        from backend.models.subscription import Subscription

        sub = Subscription(user_id=1)
        assert sub.tier == "free"
        assert sub.status == "active"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest backend/tests/test_subscription.py::TestSubscriptionModels -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'backend.models.subscription'`

- [ ] **Step 3: Create subscription model**

Create `backend/models/subscription.py`:

```python
"""Subscription and payment models."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    tier = Column(String(50), default="free", nullable=False)  # free, premium
    status = Column(String(50), default="active", nullable=False)  # active, canceled, past_due
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="subscription")


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_event_id = Column(String(255), unique=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    amount = Column(Float, nullable=True)
    currency = Column(String(10), default="eur")
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
```

- [ ] **Step 4: Add subscription relationship to User model**

In `backend/models/user.py`, add to the User class relationships:

```python
    subscription = relationship("Subscription", back_populates="user", uselist=False)
```

And add the import in `backend/models/__init__.py` if it exists, or ensure the model is imported in `backend/core/database.py` so it's picked up by `create_tables()`.

- [ ] **Step 5: Run test to verify it passes**

```bash
pytest backend/tests/test_subscription.py::TestSubscriptionModels -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/models/subscription.py backend/models/user.py backend/tests/test_subscription.py
git commit -m "feat: add Subscription and PaymentEvent models"
```

---

## Task 6: Create Subscription Schemas

**Files:**
- Create: `backend/schemas/subscription.py`

- [ ] **Step 1: Create Pydantic schemas**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/schemas/subscription.py
git commit -m "feat: add Pydantic schemas for subscription endpoints"
```

---

## Task 7: Create Subscription Service

**Files:**
- Create: `backend/services/subscription_service.py`
- Modify: `requirements.txt`

- [ ] **Step 1: Add stripe to requirements.txt**

Append to `requirements.txt`:

```
# Payments
stripe>=9.0.0
```

- [ ] **Step 2: Install stripe locally**

```bash
pip install stripe>=9.0.0
```

- [ ] **Step 3: Write failing tests for subscription service**

Add to `backend/tests/test_subscription.py`:

```python
from unittest.mock import MagicMock, patch


class TestSubscriptionEndpoints:
    """Tests for subscription API endpoints."""

    def test_get_subscription_unauthenticated(self, client):
        """Test that unauthenticated users get 401."""
        response = client.get("/api/subscriptions/me")
        assert response.status_code == 401

    def test_get_subscription_free_user(self, client):
        """Test that new users have free tier."""
        payload = create_test_user(client, "free")
        auth = register_and_login(client, payload)

        response = client.get("/api/subscriptions/me", headers=auth["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "free"
        assert data["is_premium"] is False

    @patch("backend.services.subscription_service.stripe")
    def test_create_checkout_session(self, mock_stripe, client):
        """Test creating a Stripe checkout session."""
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
        """Test that canceling a free subscription returns error."""
        payload = create_test_user(client, "cancel")
        auth = register_and_login(client, payload)

        response = client.post("/api/subscriptions/cancel", headers=auth["headers"])
        assert response.status_code == 400
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
pytest backend/tests/test_subscription.py::TestSubscriptionEndpoints -v
```

Expected: FAIL (endpoints don't exist yet)

- [ ] **Step 5: Create subscription service**

Create `backend/services/subscription_service.py`:

```python
"""Subscription management service layer."""

import logging
from datetime import datetime, timezone
from typing import Optional

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


def create_checkout_session(
    user: User, price_id: str, db: Session
) -> dict:
    """Create a Stripe Checkout session for the user."""
    if not settings.stripe_api_key:
        raise ValueError("Stripe is not configured")

    sub = get_or_create_subscription(user, db)

    # Create or reuse Stripe customer
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
    sub.canceled_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Subscription will be canceled at end of billing period"}


def handle_webhook_event(payload: bytes, sig_header: str, db: Session) -> dict:
    """Process a Stripe webhook event."""
    if not settings.stripe_webhook_secret:
        raise ValueError("Stripe webhook secret not configured")

    event = stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )

    # Record the event
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
                period["start"], tz=timezone.utc
            )
        if period.get("end"):
            sub.current_period_end = datetime.fromtimestamp(
                period["end"], tz=timezone.utc
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
        sub.canceled_at = datetime.now(timezone.utc)
        db.commit()


def _get_user_id_from_event(data: dict, db: Session) -> Optional[int]:
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
```

- [ ] **Step 6: Commit**

```bash
git add backend/services/subscription_service.py requirements.txt
git commit -m "feat: add subscription service with Stripe integration"
```

---

## Task 8: Create Subscription Router and Register It

**Files:**
- Create: `backend/api/subscription_router.py`
- Modify: `backend/api/__init__.py`

- [ ] **Step 1: Create subscription router**

Create `backend/api/subscription_router.py`:

```python
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
    """Handle Stripe webhook events. No auth required -- uses Stripe signature."""
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
            status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook processing failed"
        )
```

- [ ] **Step 2: Register router in api/__init__.py**

Add to `backend/api/__init__.py`:

```python
from backend.api.subscription_router import router as subscription_router
```

And add to the router registrations:

```python
api_router.include_router(subscription_router, prefix="/subscriptions", tags=["subscriptions"])
```

- [ ] **Step 3: Add "subscriptions" to conftest.py table cleanup**

In `backend/tests/conftest.py`, add `"subscriptions"` and `"payment_events"` to the tables list in the `client` fixture:

```python
        tables = [
            "payment_events", "subscriptions",
            "nutrition_checkins", "weight_logs", "meals", "daily_nutrition",
            "exercises", "workouts", "food_logs", "activities", "users",
        ]
```

- [ ] **Step 4: Run all subscription tests**

```bash
pytest backend/tests/test_subscription.py -v
```

Expected: All tests PASS

- [ ] **Step 5: Run full backend test suite**

```bash
pytest backend/tests/ -v --tb=short
```

Expected: All existing tests still pass + new subscription tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/api/subscription_router.py backend/api/__init__.py backend/tests/conftest.py backend/schemas/subscription.py
git commit -m "feat: add subscription router with checkout, status, cancel, and webhook endpoints"
```

---

## Task 9: Create Alembic Migration for Subscription Tables

**Files:**
- Create: New alembic migration file

- [ ] **Step 1: Generate migration**

```bash
alembic revision --autogenerate -m "add subscription and payment_events tables"
```

- [ ] **Step 2: Review the generated migration**

Open the generated file in `alembic/versions/` and verify it creates:
- `subscriptions` table with all columns
- `payment_events` table with all columns
- Foreign keys to `users` table
- Unique constraint on `subscriptions.user_id`
- Unique constraint on `payment_events.stripe_event_id`

- [ ] **Step 3: Apply migration**

```bash
alembic upgrade head
```

- [ ] **Step 4: Verify tables exist**

```bash
python -c "from backend.core.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
```

Expected: Output includes `subscriptions` and `payment_events`

- [ ] **Step 5: Commit**

```bash
git add alembic/
git commit -m "feat: add alembic migration for subscription and payment_events tables"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full backend test suite with coverage**

```bash
pytest backend/tests/ -v --tb=short --cov=backend --cov-report=term-missing
```

Expected: All tests pass, coverage report shows new files covered.

- [ ] **Step 2: Run ruff on all backend code**

```bash
ruff check backend/ ai_modules/
```

Expected: No errors.

- [ ] **Step 3: Run frontend lint**

```bash
cd frontend && npm run lint
```

Expected: No errors, zero warnings.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && npm run test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Verify no console.log calls remain**

```bash
cd frontend && grep -r "console\.\(log\|warn\|error\|info\)" src/ --include="*.js" --include="*.jsx" | grep -v "node_modules" | grep -v "logger.js" | wc -l
```

Expected: 0 (only logger.js should use console internally).

- [ ] **Step 6: Manual smoke test**

Start the backend and frontend:

```bash
# Terminal 1
uvicorn backend.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Verify:
- App loads without console errors in browser dev tools
- `GET /api/subscriptions/me` returns `{"is_premium": false, "tier": "free", ...}` for logged-in user
- `GET /health` returns 200

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: sprint 1 final verification fixes"
```
