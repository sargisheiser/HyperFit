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
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
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

@router.post("/analyze", response_model=MealAnalysisResponse)
async def analyze_meal(
    analysis_request: MealAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze a meal using AI (placeholder for now)."""
    # TODO: Implement OpenAI GPT-4 Vision integration
    # For now, return mock data
    mock_analysis = MealAnalysisResponse(
        food_items=[
            {"name": "Grilled Chicken", "quantity": "150g", "confidence": 0.9},
            {"name": "Brown Rice", "quantity": "100g", "confidence": 0.8},
            {"name": "Mixed Vegetables", "quantity": "75g", "confidence": 0.7}
        ],
        total_calories=450.0,
        macronutrients={
            "protein": 35.0,
            "carbs": 45.0,
            "fat": 12.0,
            "fiber": 8.0
        },
        confidence_score=0.8,
        analysis_details={
            "processing_time": "2.3s",
            "model_version": "gpt-4-vision-preview"
        }
    )
    
    return mock_analysis
