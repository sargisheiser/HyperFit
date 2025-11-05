"""
Meal API Routes - Food tracking and nutrition analysis endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime

from backend.core.database import get_db
from backend.core.auth import get_current_active_user
from backend.models.meal import (
    MealCreate, 
    MealResponse, 
    MealUpdate,
    MealAnalysisRequest,
    MealAnalysisResponse
)
from database.models.meal import Meal
from database.models.user import User
from backend.core.config import settings
from backend.services.meal_service import MealService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(
    meal: MealCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new meal entry."""
    db_meal = Meal(
        user_id=current_user.id,
        name=meal.name,
        description=meal.description,
        meal_type=meal.meal_type
    )
    
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    
    return db_meal

@router.get("/", response_model=List[MealResponse])
async def get_meals(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's meals with pagination."""
    meals = db.query(Meal).filter(Meal.user_id == current_user.id).offset(skip).limit(limit).all()
    return meals

@router.get("/{meal_id}", response_model=MealResponse)
async def get_meal(
    meal_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific meal by ID."""
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    return meal

@router.put("/{meal_id}", response_model=MealResponse)
async def update_meal(
    meal_id: int,
    meal_update: MealUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a meal."""
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    update_data = meal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meal, field, value)
    
    db.commit()
    db.refresh(meal)
    
    return meal

@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal(
    meal_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a meal."""
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == current_user.id
    ).first()
    
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    db.delete(meal)
    db.commit()
    
    return None

@router.post("/upload-image")
async def upload_meal_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload an image for meal analysis."""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file extension
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.allowed_extensions_list)}"
        )
    
    # Validate file size
    content = await file.read()
    file_size = len(content)
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size / 1024 / 1024:.1f}MB"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    logger.info(f"Image uploaded successfully: {file_path} for user {current_user.id}")
    
    return {
        "filename": unique_filename,
        "file_path": file_path,
        "file_url": f"/uploads/{unique_filename}",
        "size_bytes": file_size
    }

@router.post("/analyze", response_model=MealAnalysisResponse)
async def analyze_meal(
    analysis_request: MealAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze a meal using OpenAI GPT-4 Vision."""
    try:
        # Determine image path
        image_path = None
        
        if analysis_request.image_path:
            # Use provided path
            image_path = analysis_request.image_path
            if not os.path.exists(image_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Image file not found: {image_path}"
                )
        elif analysis_request.image_url:
            # Handle image URL - extract path from URL if it's a local upload
            if analysis_request.image_url.startswith("/uploads/"):
                image_path = os.path.join(settings.upload_dir, analysis_request.image_url.replace("/uploads/", ""))
                if not os.path.exists(image_path):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Image file not found: {image_path}"
                    )
            else:
                # External URL download (future enhancement)
                raise HTTPException(
                    status_code=400,
                    detail="External image URL download not yet implemented. Please use image_path or upload image first."
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Either image_path or image_url must be provided"
            )
        
        # Prepare user context
        user_context = analysis_request.user_context or {}
        
        # Add user profile data to context if available
        if current_user.dietary_preferences:
            try:
                import json
                user_context.setdefault("dietary_preferences", json.loads(current_user.dietary_preferences))
            except:
                pass
        
        if current_user.allergies:
            try:
                import json
                user_context.setdefault("allergies", json.loads(current_user.allergies))
            except:
                pass
        
        # Perform AI analysis
        logger.info(f"Starting meal analysis for user {current_user.id}, image: {image_path}")
        
        result = await MealService.analyze_meal_with_ai(
            image_path=image_path,
            user_id=current_user.id,
            db=db,
            user_context=user_context
        )
        
        analysis = result["analysis"]
        
        # Format response
        response = MealAnalysisResponse(
            food_items=analysis.get("food_items", []),
            total_calories=analysis.get("total_calories", 0.0),
            macronutrients={
                "protein": analysis.get("macronutrients", {}).get("protein_grams", 0.0),
                "carbs": analysis.get("macronutrients", {}).get("carbs_grams", 0.0),
                "fat": analysis.get("macronutrients", {}).get("fat_grams", 0.0),
                "fiber": analysis.get("macronutrients", {}).get("fiber_grams", 0.0),
                "sugar": analysis.get("macronutrients", {}).get("sugar_grams", 0.0),
            },
            confidence_score=analysis.get("confidence_score", 0.0),
            analysis_details={
                "processing_time": f"{analysis.get('processing_time_seconds', 0):.2f}s",
                "model_version": analysis.get("model_used", "unknown"),
                "meal_id": result.get("meal_id"),
                **analysis.get("analysis_details", {})
            }
        )
        
        logger.info(f"Meal analysis completed successfully for user {current_user.id}")
        
        return response
    
    except ValueError as e:
        logger.error(f"Validation error in meal analysis: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing meal: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing meal image: {str(e)}"
        )

@router.post("/upload-and-analyze", response_model=MealAnalysisResponse)
async def upload_and_analyze_meal(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload an image and analyze it in one step.
    Convenience endpoint that combines upload and analysis.
    """
    try:
        # Upload the image
        upload_result = await upload_meal_image(file, current_user)
        file_path = upload_result["file_path"]
        
        # Analyze the uploaded image
        analysis_request = MealAnalysisRequest(image_path=file_path)
        return await analyze_meal(analysis_request, current_user, db)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload and analyze: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing meal image: {str(e)}"
        )
