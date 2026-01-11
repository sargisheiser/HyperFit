"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.core.rate_limit import limiter
from backend.models.user import (
    PasswordReset,
    PasswordResetRequest,
    TokenResponse,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
import backend.services.auth_service as auth_service


router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register_user(
    request: Request,
    payload: UserCreate,
    db: Session = Depends(get_db_session),
) -> UserResponse:
    """Register a new user account."""

    try:
        return auth_service.register_user(payload, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login_user(
    request: Request,
    payload: UserLogin,
    db: Session = Depends(get_db_session),
) -> TokenResponse:
    """Authenticate user credentials and return JWT tokens."""

    try:
        return auth_service.authenticate_user(payload, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except KeyError as exc:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Missing required field in login request: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required authentication fields"
        )
    except Exception as exc:
        # Log the full error for debugging
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        error_details = traceback.format_exc()
        logger.error(f"Login error: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during authentication"
        )


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return profile data for the authenticated user."""

    return auth_service.profile_response(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> UserResponse:
    """Update profile information for the authenticated user."""

    try:
        return auth_service.update_user(current_user, user_update, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db_session),
):
    """Request a password reset. Sends reset token to user's email."""
    
    try:
        result = auth_service.request_password_reset(request.email, db)
        return result
    except (ValueError, KeyError) as exc:
        # Always return success message for security (don't reveal if email exists)
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Password reset request error (suppressed): {exc}")
        return {"message": "If the email exists, a password reset link has been sent."}
    except Exception as exc:
        # Always return success message for security (don't reveal if email exists)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in password reset request (suppressed): {exc}", exc_info=True)
        return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db_session),
):
    """Reset password using a valid reset token."""
    
    try:
        result = auth_service.reset_password(reset_data.token, reset_data.new_password, db)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


