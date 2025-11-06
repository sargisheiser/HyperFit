"""
Activity Service - Business logic for steps tracking and calorie calculations
"""

import logging
from typing import Optional, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models.activity import Activity
from database.models.user import User
from database.models.meal import Meal
from database.models.workout import Workout

logger = logging.getLogger(__name__)

class ActivityService:
    """Service for activity-related business logic."""
    
    # Average step length in meters (approximately 0.7m for average adult)
    STEP_LENGTH_M = 0.7
    
    # Calories burned per step (approximately 0.04-0.05 calories per step)
    # This varies based on weight, but we'll use an average
    CALORIES_PER_STEP = 0.04
    
    @staticmethod
    def calculate_distance_km(steps: int) -> float:
        """Calculate distance in kilometers from steps."""
        return round((steps * ActivityService.STEP_LENGTH_M) / 1000.0, 2)
    
    @staticmethod
    def calculate_calories_from_steps(steps: int, user: Optional[User] = None) -> float:
        """
        Calculate calories burned from steps.
        Takes into account user weight if available.
        """
        base_calories = steps * ActivityService.CALORIES_PER_STEP
        
        # Adjust based on weight if available
        if user and user.weight:
            try:
                weight_kg = float(user.weight)
                # Heavier people burn more calories per step
                weight_multiplier = weight_kg / 70.0  # Normalize to 70kg average
                base_calories *= weight_multiplier
            except (ValueError, TypeError):
                pass
        
        return round(base_calories, 1)
    
    @staticmethod
    def get_today_activity(user_id: int, db: Session) -> Optional[Activity]:
        """Get today's activity record for a user."""
        today = date.today()
        return db.query(Activity).filter(
            Activity.user_id == user_id,
            Activity.date == today
        ).first()
    
    @staticmethod
    def get_or_create_today_activity(user_id: int, db: Session) -> Activity:
        """Get or create today's activity record."""
        today = date.today()
        activity = ActivityService.get_today_activity(user_id, db)
        
        if not activity:
            activity = Activity(
                user_id=user_id,
                date=today,
                steps=0
            )
            db.add(activity)
            db.commit()
            db.refresh(activity)
        
        return activity
    
    @staticmethod
    def add_steps(user_id: int, steps: int, db: Session, user: Optional[User] = None) -> Activity:
        """Add steps to today's activity."""
        activity = ActivityService.get_or_create_today_activity(user_id, db)
        
        activity.steps += steps
        activity.distance_km = ActivityService.calculate_distance_km(activity.steps)
        activity.calories_burned = ActivityService.calculate_calories_from_steps(
            activity.steps, 
            user or db.query(User).filter(User.id == user_id).first()
        )
        
        db.commit()
        db.refresh(activity)
        
        logger.info(f"Added {steps} steps for user {user_id}. Total: {activity.steps}")
        
        return activity
    
    @staticmethod
    def set_steps(user_id: int, steps: int, db: Session, user: Optional[User] = None) -> Activity:
        """Set steps for today's activity."""
        activity = ActivityService.get_or_create_today_activity(user_id, db)
        
        activity.steps = steps
        activity.distance_km = ActivityService.calculate_distance_km(activity.steps)
        activity.calories_burned = ActivityService.calculate_calories_from_steps(
            activity.steps,
            user or db.query(User).filter(User.id == user_id).first()
        )
        
        db.commit()
        db.refresh(activity)
        
        logger.info(f"Set steps to {steps} for user {user_id}")
        
        return activity
    
    @staticmethod
    def get_calorie_balance(user_id: int, db: Session, target_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Calculate calorie balance for a given date.
        
        Returns:
            Dictionary with:
            - calories_in: Total calories consumed
            - calories_out: Total calories burned (steps + workouts)
            - net_calories: calories_in - calories_out
            - steps: Steps for the day
            - workouts_calories: Calories from workouts
            - steps_calories: Calories from steps
        """
        if target_date is None:
            target_date = date.today()
        
        # Get calories from meals
        meals = db.query(Meal).filter(
            Meal.user_id == user_id,
            func.date(Meal.created_at) == target_date
        ).all()
        
        calories_in = sum(meal.estimated_calories or 0 for meal in meals)
        
        # Get calories from steps
        activity = db.query(Activity).filter(
            Activity.user_id == user_id,
            Activity.date == target_date
        ).first()
        
        steps_calories = activity.calories_burned if activity else 0.0
        steps = activity.steps if activity else 0
        
        # Get calories from workouts
        workouts = db.query(Workout).filter(
            Workout.user_id == user_id,
            func.date(Workout.created_at) == target_date
        ).all()
        
        workouts_calories = sum(workout.calories_burned or 0 for workout in workouts)
        
        # Total calories out
        calories_out = steps_calories + workouts_calories
        
        # Net calories
        net_calories = calories_in - calories_out
        
        return {
            "calories_in": round(calories_in, 1),
            "calories_out": round(calories_out, 1),
            "net_calories": round(net_calories, 1),
            "steps": steps,
            "steps_calories": round(steps_calories, 1),
            "workouts_calories": round(workouts_calories, 1),
            "date": target_date.isoformat()
        }
    
    @staticmethod
    def get_weekly_summary(user_id: int, db: Session) -> Dict[str, Any]:
        """Get weekly activity summary."""
        from datetime import timedelta
        
        today = date.today()
        week_start = today - timedelta(days=6)  # Last 7 days
        
        activities = db.query(Activity).filter(
            Activity.user_id == user_id,
            Activity.date >= week_start,
            Activity.date <= today
        ).all()
        
        total_steps = sum(activity.steps for activity in activities)
        total_distance = sum(activity.distance_km or 0 for activity in activities)
        total_calories_burned = sum(activity.calories_burned or 0 for activity in activities)
        avg_daily_steps = total_steps / 7 if activities else 0
        
        return {
            "total_steps": total_steps,
            "total_distance_km": round(total_distance, 2),
            "total_calories_burned": round(total_calories_burned, 1),
            "avg_daily_steps": round(avg_daily_steps, 0),
            "days_tracked": len(activities)
        }


