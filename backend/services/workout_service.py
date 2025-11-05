"""
Workout Service - Business logic for workout operations
"""

import json
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models.workout import Workout, Exercise
from database.models.ai_log import AILog
from ai_modules.workout_tracking.mediapipe_service import get_workout_recognition_service

logger = logging.getLogger(__name__)

class WorkoutService:
    """Service for workout-related business logic."""
    
    @staticmethod
    async def analyze_workout_with_ai(
        video_path: str,
        user_id: int,
        db: Session,
        workout_type: Optional[str] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a workout video using MediaPipe and save results.
        
        Args:
            video_path: Path to the workout video
            user_id: ID of the user
            db: Database session
            workout_type: Optional workout type hint
            user_context: Optional user context
        
        Returns:
            Analysis result dictionary
        """
        workout_service = get_workout_recognition_service()
        ai_log = None
        
        try:
            logger.info(f"Starting workout analysis for user {user_id}, video: {video_path}")
            
            # Perform AI analysis
            analysis_result = await workout_service.analyze_workout_video(
                video_path=video_path,
                workout_type=workout_type
            )
            
            # Extract exercise data
            detected_exercises = analysis_result.get("detected_exercises", [])
            total_reps = analysis_result.get("total_reps", 0)
            total_sets = analysis_result.get("total_sets", 0)
            calories_burned = analysis_result.get("estimated_calories", 0.0)
            
            # Create workout record
            workout_name = workout_type or detected_exercises[0].get("name", "Workout") if detected_exercises else "Workout"
            duration_minutes = int(analysis_result.get("video_duration", 0) / 60) if analysis_result.get("video_duration") else None
            
            workout = Workout(
                user_id=user_id,
                name=workout_name,
                workout_type=workout_type or "strength",
                duration_minutes=duration_minutes,
                ai_analysis=json.dumps(analysis_result),
                confidence_score=analysis_result.get("confidence_score", 0.0),
                detected_exercises=json.dumps(detected_exercises),
                total_reps=total_reps,
                total_sets=total_sets,
                calories_burned=calories_burned,
                video_path=video_path,
                is_completed=True
            )
            
            db.add(workout)
            db.commit()
            db.refresh(workout)
            
            # Create exercise records
            for exercise_data in detected_exercises:
                exercise = Exercise(
                    workout_id=workout.id,
                    name=exercise_data.get("name", "Exercise"),
                    exercise_type=workout_type or "strength",
                    sets=exercise_data.get("sets", 0),
                    reps=exercise_data.get("reps", 0),
                    duration_seconds=int(exercise_data.get("duration_seconds", 0)),
                    confidence_score=exercise_data.get("confidence", 0.0),
                    rep_count_ai=exercise_data.get("reps", 0)
                )
                db.add(exercise)
            
            db.commit()
            db.refresh(workout)
            
            # Log AI interaction
            try:
                ai_log = AILog(
                    user_id=user_id,
                    interaction_type="workout_analysis",
                    model_used="mediapipe_pose",
                    input_data=json.dumps({"video_path": video_path, "workout_type": workout_type}),
                    output_data=json.dumps(analysis_result),
                    processing_time_ms=int(analysis_result.get("processing_time_seconds", 0) * 1000),
                    confidence_score=analysis_result.get("confidence_score"),
                    is_successful=True
                )
                db.add(ai_log)
                db.commit()
            except Exception as e:
                logger.warning(f"Failed to create AI log: {e}")
            
            logger.info(f"Successfully analyzed workout for user {user_id}, workout ID: {workout.id}")
            
            return {
                "workout_id": workout.id,
                "analysis": analysis_result,
                "exercises": detected_exercises
            }
        
        except Exception as e:
            logger.error(f"Error in workout analysis: {e}", exc_info=True)
            
            # Log failed AI interaction
            try:
                failed_log = AILog(
                    user_id=user_id,
                    interaction_type="workout_analysis",
                    model_used="mediapipe_pose",
                    input_data=json.dumps({"video_path": video_path}),
                    error_message=str(e),
                    is_successful=False
                )
                db.add(failed_log)
                db.commit()
            except:
                pass
            
            raise
