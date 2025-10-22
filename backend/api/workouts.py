"""
Workout API Routes - Exercise tracking and AI analysis endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime

from backend.core.database import get_db
from backend.core.auth import get_current_active_user
from backend.models.workout import (
    WorkoutCreate,
    WorkoutResponse,
    WorkoutUpdate,
    WorkoutAnalysisRequest,
    WorkoutAnalysisResponse,
    ExerciseCreate,
    ExerciseResponse
)
from database.models.workout import Workout, Exercise
from database.models.user import User
from backend.core.config import settings

router = APIRouter()

@router.post("/", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
async def create_workout(
    workout: WorkoutCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new workout."""
    db_workout = Workout(
        user_id=current_user.id,
        name=workout.name,
        workout_type=workout.workout_type,
        duration_minutes=workout.duration_minutes,
        notes=workout.notes
    )
    
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    
    # Add exercises if provided
    if workout.exercises:
        for exercise_data in workout.exercises:
            db_exercise = Exercise(
                workout_id=db_workout.id,
                name=exercise_data.name,
                exercise_type=exercise_data.exercise_type,
                sets=exercise_data.sets,
                reps=exercise_data.reps,
                weight_kg=exercise_data.weight_kg,
                duration_seconds=exercise_data.duration_seconds,
                distance_meters=exercise_data.distance_meters
            )
            db.add(db_exercise)
        
        db.commit()
        db.refresh(db_workout)
    
    return db_workout

@router.get("/", response_model=List[WorkoutResponse])
async def get_workouts(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's workouts with pagination."""
    workouts = db.query(Workout).filter(Workout.user_id == current_user.id).offset(skip).limit(limit).all()
    return workouts

@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific workout by ID."""
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    return workout

@router.put("/{workout_id}", response_model=WorkoutResponse)
async def update_workout(
    workout_id: int,
    workout_update: WorkoutUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a workout."""
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    update_data = workout_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "exercises" and value:
            # Handle exercise updates
            # Clear existing exercises
            db.query(Exercise).filter(Exercise.workout_id == workout_id).delete()
            
            # Add new exercises
            for exercise_data in value:
                db_exercise = Exercise(
                    workout_id=workout_id,
                    name=exercise_data.name,
                    exercise_type=exercise_data.exercise_type,
                    sets=exercise_data.sets,
                    reps=exercise_data.reps,
                    weight_kg=exercise_data.weight_kg,
                    duration_seconds=exercise_data.duration_seconds,
                    distance_meters=exercise_data.distance_meters
                )
                db.add(db_exercise)
        else:
            setattr(workout, field, value)
    
    db.commit()
    db.refresh(workout)
    
    return workout

@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a workout."""
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    db.delete(workout)
    db.commit()
    
    return None

@router.post("/upload-video")
async def upload_workout_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a video for workout analysis."""
    # Validate file type
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "mp4"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {
        "filename": unique_filename,
        "file_path": file_path,
        "file_url": f"/uploads/{unique_filename}"
    }

@router.post("/analyze", response_model=WorkoutAnalysisResponse)
async def analyze_workout(
    analysis_request: WorkoutAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze a workout using AI (placeholder for now)."""
    # TODO: Implement MediaPipe integration
    # For now, return mock data
    mock_analysis = WorkoutAnalysisResponse(
        detected_exercises=[
            {"name": "Push-ups", "reps": 15, "sets": 3, "confidence": 0.9},
            {"name": "Squats", "reps": 20, "sets": 3, "confidence": 0.8},
            {"name": "Plank", "duration": 30, "confidence": 0.7}
        ],
        total_reps=105,
        total_sets=9,
        estimated_calories=180.0,
        form_analysis={
            "overall_score": 8.5,
            "recommendations": ["Keep core tight during push-ups", "Go deeper on squats"]
        },
        confidence_score=0.8
    )
    
    return mock_analysis

@router.get("/{workout_id}/exercises", response_model=List[ExerciseResponse])
async def get_workout_exercises(
    workout_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get exercises for a specific workout."""
    # Verify workout belongs to user
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    exercises = db.query(Exercise).filter(Exercise.workout_id == workout_id).all()
    return exercises
