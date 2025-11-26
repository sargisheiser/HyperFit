"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
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
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db_session),
) -> UserResponse:
    """Register a new user account."""

    try:
        return auth_service.register_user(payload, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: UserLogin,
    db: Session = Depends(get_db_session),
) -> TokenResponse:
    """Authenticate user credentials and return JWT tokens."""

    try:
        return auth_service.authenticate_user(payload, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except Exception as exc:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Login error: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(exc)}"
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
    except Exception as exc:
        # Always return success message for security (don't reveal if email exists)
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


