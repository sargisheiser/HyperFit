"""
Meal Service - Business logic for meal operations
"""

import json
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models.meal import Meal
from database.models.ai_log import AILog
from ai_modules.food_recognition.openai_service import get_food_recognition_service

logger = logging.getLogger(__name__)

class MealService:
    """Service for meal-related business logic."""
    
    @staticmethod
    async def analyze_meal_with_ai(
        image_path: str,
        user_id: int,
        db: Session,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a meal image using AI and save results.
        
        Args:
            image_path: Path to the meal image
            user_id: ID of the user
            db: Database session
            user_context: Optional user context
        
        Returns:
            Analysis result dictionary
        """
        food_service = get_food_recognition_service()
        ai_log = None
        
        try:
            # Perform AI analysis
            analysis_result = await food_service.analyze_food_image(
                image_path=image_path,
                user_context=user_context
            )
            
            # Validate result
            if not food_service.validate_analysis_result(analysis_result):
                logger.warning("AI analysis result validation failed, using raw result")
            
            # Extract nutrition data
            nutrition_data = {
                "estimated_calories": analysis_result.get("total_calories", 0.0),
                "protein_grams": analysis_result.get("macronutrients", {}).get("protein_grams", 0.0),
                "carbs_grams": analysis_result.get("macronutrients", {}).get("carbs_grams", 0.0),
                "fat_grams": analysis_result.get("macronutrients", {}).get("fat_grams", 0.0),
                "fiber_grams": analysis_result.get("macronutrients", {}).get("fiber_grams", 0.0),
                "sugar_grams": analysis_result.get("macronutrients", {}).get("sugar_grams", 0.0),
            }
            
            # Create meal record
            meal = Meal(
                user_id=user_id,
                name=analysis_result.get("analysis_details", {}).get("meal_type", "meal"),
                description=f"AI-analyzed meal with {len(analysis_result.get('food_items', []))} items",
                meal_type=analysis_result.get("analysis_details", {}).get("meal_type"),
                ai_analysis=json.dumps(analysis_result),
                confidence_score=analysis_result.get("confidence_score", 0.0),
                image_path=image_path,
                **nutrition_data
            )
            
            db.add(meal)
            db.commit()
            db.refresh(meal)
            
            # Log AI interaction
            try:
                ai_log = AILog(
                    user_id=user_id,
                    interaction_type="food_analysis",
                    model_used=analysis_result.get("model_used", "unknown"),
                    input_data=json.dumps({"image_path": image_path, "user_context": user_context}),
                    output_data=json.dumps(analysis_result),
                    processing_time_ms=int(analysis_result.get("processing_time_seconds", 0) * 1000),
                    confidence_score=analysis_result.get("confidence_score"),
                    tokens_used=analysis_result.get("tokens_used"),
                    is_successful=True
                )
                db.add(ai_log)
                db.commit()
            except Exception as e:
                logger.warning(f"Failed to create AI log: {e}")
            
            logger.info(f"Successfully analyzed meal for user {user_id}, meal ID: {meal.id}")
            
            return {
                "meal_id": meal.id,
                "analysis": analysis_result,
                "nutrition": nutrition_data
            }
        
        except Exception as e:
            logger.error(f"Error in meal analysis: {e}", exc_info=True)
            
            # Log failed AI interaction
            try:
                failed_log = AILog(
                    user_id=user_id,
                    interaction_type="food_analysis",
                    model_used="unknown",
                    input_data=json.dumps({"image_path": image_path}),
                    error_message=str(e),
                    is_successful=False
                )
                db.add(failed_log)
                db.commit()
            except:
                pass
            
            raise
