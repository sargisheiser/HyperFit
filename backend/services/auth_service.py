"""Authentication and user management service layer."""

import secrets
from datetime import datetime, timedelta
from typing import Any, Dict

from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security import create_access_token, get_password_hash, verify_password
from backend.models.user import TokenResponse, User, UserCreate, UserLogin, UserResponse, UserUpdate


def serialize_user(user: User) -> Dict[str, Any]:
    """Normalize SQLAlchemy user instance to dict suitable for UserResponse."""

    def _parse_json(value: Any) -> Any:
        if value in (None, "", "null"):
            return None
        if isinstance(value, (list, dict)):
            return value
        try:
            import json

            return json.loads(value)
        except Exception:
            return value

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "birth_date": user.birth_date,
        "height_cm": user.height_cm,
        "weight_kg": user.weight_kg,
        "gender": user.gender,
        "activity_level": user.activity_level,
        "fitness_goals": _parse_json(user.fitness_goals) or [],
        "dietary_preferences": _parse_json(user.dietary_preferences) or [],
        "allergies": _parse_json(user.allergies) or [],
        "daily_calorie_target": user.daily_calorie_target,
        "daily_protein_target": user.daily_protein_target,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
    }


def register_user(user_in: UserCreate, db: Session) -> UserResponse:
    """Create a new user record and return sanitized response."""

    if db.query(User).filter(User.email == user_in.email).first():
        raise ValueError("Email already registered")

    if db.query(User).filter(User.username == user_in.username).first():
        raise ValueError("Username already taken")

    hashed_password = get_password_hash(user_in.password)

    import json

    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        birth_date=user_in.birth_date,
        height_cm=user_in.height_cm,
        weight_kg=user_in.weight_kg,
        gender=user_in.gender,
        activity_level=user_in.activity_level,
        fitness_goals=json.dumps(user_in.fitness_goals or []),
        dietary_preferences=json.dumps(user_in.dietary_preferences or []),
        allergies=json.dumps(user_in.allergies or []),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(**serialize_user(user))


def authenticate_user(user_in: UserLogin, db: Session) -> TokenResponse:
    """Validate credentials and issue JWT token."""

    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise ValueError("Invalid credentials")

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    user.last_login = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=access_token,
        expires_in=int(access_token_expires.total_seconds()),
    )


def profile_response(user: User) -> UserResponse:
    """Convert user model to response schema."""

    return UserResponse(**serialize_user(user))


def update_user(user: User, user_update: UserUpdate, db: Session) -> UserResponse:
    """Update user profile information."""
    import json
    from datetime import datetime

    # Update only provided fields
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.birth_date is not None:
        user.birth_date = user_update.birth_date
    if user_update.height_cm is not None:
        user.height_cm = user_update.height_cm
    if user_update.weight_kg is not None:
        user.weight_kg = user_update.weight_kg
    if user_update.gender is not None:
        user.gender = user_update.gender
    if user_update.activity_level is not None:
        user.activity_level = user_update.activity_level
    if user_update.fitness_goals is not None:
        user.fitness_goals = json.dumps(user_update.fitness_goals)
    if user_update.dietary_preferences is not None:
        user.dietary_preferences = json.dumps(user_update.dietary_preferences)
    if user_update.allergies is not None:
        user.allergies = json.dumps(user_update.allergies)
    if user_update.daily_calorie_target is not None:
        user.daily_calorie_target = user_update.daily_calorie_target
    if user_update.daily_protein_target is not None:
        user.daily_protein_target = user_update.daily_protein_target

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return UserResponse(**serialize_user(user))


def request_password_reset(email: str, db: Session) -> Dict[str, Any]:
    """Generate a password reset token and store it for the user."""
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Generate secure token
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    
    user.reset_token = reset_token
    user.reset_token_expires = reset_token_expires
    db.commit()
    
    # In production, send email here with reset link
    # For now, we'll return the token (should be removed in production)
    print(f"[DEBUG] Password reset token for {email}: {reset_token}")
    print(f"[DEBUG] Reset link: /reset-password?token={reset_token}")
    
    return {
        "message": "If the email exists, a password reset link has been sent.",
        "token": reset_token,  # Remove this in production - only for development
    }


def reset_password(token: str, new_password: str, db: Session) -> Dict[str, Any]:
    """Reset user password using a valid reset token."""
    
    user = db.query(User).filter(User.reset_token == token).first()
    
    if not user:
        raise ValueError("Invalid or expired reset token")
    
    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        # Clear expired token
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise ValueError("Invalid or expired reset token")
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password has been reset successfully"}









