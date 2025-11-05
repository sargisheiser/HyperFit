"""
User API Routes - Authentication and user management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.core.database import get_db
from backend.core.auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash,
    get_current_active_user
)
from backend.models.user import (
    UserCreate, 
    UserResponse, 
    UserUpdate, 
    UserLogin, 
    Token
)
from database.models.user import User
from backend.core.config import settings
from datetime import timedelta

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Registration attempt for email: {user.email}, username: {user.username}")
        
        # Check if user already exists
        db_user = db.query(User).filter(
            (User.email == user.email) | (User.username == user.username)
        ).first()
        
        if db_user:
            logger.warning(f"Registration failed: User already exists - email: {user.email}, username: {user.username}")
            raise HTTPException(
                status_code=400,
                detail="Email or username already registered"
            )
        
        # Create new user
        logger.info("Hashing password...")
        hashed_password = get_password_hash(user.password)
        logger.info("Password hashed successfully")
        
        logger.info("Creating user object...")
        db_user = User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_password,
            full_name=user.full_name,
            age=user.age,
            height=user.height,
            weight=str(user.weight) if user.weight else None,
            gender=user.gender,
            activity_level=user.activity_level,
            fitness_goals=str(user.fitness_goals) if user.fitness_goals else None,
            dietary_preferences=str(user.dietary_preferences) if user.dietary_preferences else None,
            allergies=str(user.allergies) if user.allergies else None
        )
        
        logger.info("Adding user to database...")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"User registered successfully: ID={db_user.id}, email={db_user.email}")
        
        return db_user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user information."""
    update_data = user_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field in ["fitness_goals", "dietary_preferences", "allergies"] and value:
            setattr(current_user, field, str(value))
        else:
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete current user account."""
    db.delete(current_user)
    db.commit()
    return None

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only - for future implementation)."""
    # For now, just return current user
    return [current_user]
