"""
Activity API Routes - Steps tracking and calorie balance endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from backend.core.database import get_db
from backend.core.auth import get_current_active_user
from backend.models.activity import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
    CalorieBalanceResponse,
    WeeklySummaryResponse
)
from database.models.activity import Activity
from database.models.user import User
from backend.services.activity_service import ActivityService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity: ActivityCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create or update activity for a specific date."""
    target_date = activity.date or date.today()
    
    # Check if activity already exists for this date
    existing = db.query(Activity).filter(
        Activity.user_id == current_user.id,
        Activity.date == target_date
    ).first()
    
    if existing:
        # Update existing
        existing.steps = activity.steps
        existing.distance_km = ActivityService.calculate_distance_km(existing.steps)
        existing.calories_burned = ActivityService.calculate_calories_from_steps(
            existing.steps, 
            current_user
        )
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        db_activity = Activity(
            user_id=current_user.id,
            steps=activity.steps,
            date=target_date,
            distance_km=ActivityService.calculate_distance_km(activity.steps),
            calories_burned=ActivityService.calculate_calories_from_steps(
                activity.steps,
                current_user
            )
        )
        db.add(db_activity)
        db.commit()
        db.refresh(db_activity)
        return db_activity

@router.get("/", response_model=ActivityResponse)
async def get_today_activity(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get today's activity."""
    activity = ActivityService.get_today_activity(current_user.id, db)
    
    if not activity:
        # Return default values
        return ActivityResponse(
            id=0,
            user_id=current_user.id,
            steps=0,
            date=date.today(),
            distance_km=0.0,
            calories_burned=0.0,
            active_minutes=0,
            created_at=datetime.now(),
            updated_at=None
        )
    
    return activity

@router.put("/", response_model=ActivityResponse)
async def update_today_activity(
    activity_update: ActivityUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update today's activity."""
    activity = ActivityService.get_or_create_today_activity(current_user.id, db)
    
    if activity_update.steps is not None:
        activity.steps = activity_update.steps
        activity.distance_km = ActivityService.calculate_distance_km(activity.steps)
        activity.calories_burned = ActivityService.calculate_calories_from_steps(
            activity.steps,
            current_user
        )
    
    if activity_update.active_minutes is not None:
        activity.active_minutes = activity_update.active_minutes
    
    db.commit()
    db.refresh(activity)
    
    return activity

@router.post("/steps", response_model=ActivityResponse)
async def add_steps(
    steps: int = Query(..., ge=0, description="Number of steps to add"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add steps to today's activity."""
    return ActivityService.add_steps(current_user.id, steps, db, current_user)

@router.get("/calorie-balance", response_model=CalorieBalanceResponse)
async def get_calorie_balance(
    target_date: Optional[date] = Query(None, description="Date to check balance (default: today)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get calorie balance for a specific date."""
    balance = ActivityService.get_calorie_balance(current_user.id, db, target_date)
    return CalorieBalanceResponse(**balance)

@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get weekly activity summary."""
    summary = ActivityService.get_weekly_summary(current_user.id, db)
    return WeeklySummaryResponse(**summary)

