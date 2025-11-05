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
from backend.services.workout_service import WorkoutService
import logging

logger = logging.getLogger(__name__)

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
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Validate file size
    content = await file.read()
    file_size = len(content)
    if file_size > settings.max_file_size * 10:  # 100MB for videos
        raise HTTPException(
            status_code=400,
            detail=f"Video too large. Maximum size: {settings.max_file_size * 10 / 1024 / 1024:.1f}MB"
        )
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    logger.info(f"Video uploaded successfully: {file_path} for user {current_user.id}")
    
    return {
        "filename": unique_filename,
        "file_path": file_path,
        "file_url": f"/uploads/{unique_filename}",
        "size_bytes": file_size
    }

@router.post("/upload-and-analyze", response_model=WorkoutAnalysisResponse)
async def upload_and_analyze_workout(
    file: UploadFile = File(...),
    workout_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload a video and analyze it in one step.
    Convenience endpoint that combines upload and analysis.
    """
    try:
        # Upload the video
        upload_result = await upload_workout_video(file, current_user)
        video_path = upload_result["file_path"]
        
        # Analyze the uploaded video
        analysis_request = WorkoutAnalysisRequest(video_path=video_path, workout_type=workout_type)
        return await analyze_workout(analysis_request, current_user, db)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload and analyze: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing workout video: {str(e)}"
        )

@router.post("/analyze", response_model=WorkoutAnalysisResponse)
async def analyze_workout(
    analysis_request: WorkoutAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze a workout using MediaPipe Pose detection."""
    try:
        # Determine video path
        video_path = None
        
        if analysis_request.video_path:
            video_path = analysis_request.video_path
            if not os.path.exists(video_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Video file not found: {video_path}"
                )
        elif analysis_request.video_url:
            # Handle video URL - extract path from URL if it's a local upload
            if analysis_request.video_url.startswith("/uploads/"):
                video_path = os.path.join(settings.upload_dir, analysis_request.video_url.replace("/uploads/", ""))
                if not os.path.exists(video_path):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Video file not found: {video_path}"
                    )
            else:
                # External URL download (future enhancement)
                raise HTTPException(
                    status_code=400,
                    detail="External video URL download not yet implemented. Please use video_path or upload video first."
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Either video_path or video_url must be provided"
            )
        
        # Prepare user context
        user_context = analysis_request.user_context or {}
        
        # Perform AI analysis
        logger.info(f"Starting workout analysis for user {current_user.id}, video: {video_path}")
        
        result = await WorkoutService.analyze_workout_with_ai(
            video_path=video_path,
            user_id=current_user.id,
            db=db,
            workout_type=analysis_request.workout_type,
            user_context=user_context
        )
        
        analysis = result["analysis"]
        
        # Format response
        response = WorkoutAnalysisResponse(
            detected_exercises=analysis.get("detected_exercises", []),
            total_reps=analysis.get("total_reps", 0),
            total_sets=analysis.get("total_sets", 0),
            estimated_calories=analysis.get("estimated_calories", 0.0),
            form_analysis=analysis.get("form_analysis", {
                "overall_score": 7.0,
                "recommendations": []
            }),
            confidence_score=analysis.get("confidence_score", 0.5)
        )
        
        logger.info(f"Workout analysis completed successfully for user {current_user.id}")
        
        return response
    
    except ValueError as e:
        logger.error(f"Validation error in workout analysis: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing workout: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing workout video: {str(e)}"
        )

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
