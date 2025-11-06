"""
HyperAI Agent API Routes - Enhanced LangGraph + OpenAI + Tavily powered agent
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import logging
import asyncio

from backend.core.auth import get_current_active_user
from database.models.user import User
from backend.services.agent_service import (
    ask_agent,
    generate_workout_plan,
    analyze_nutrition,
    analyze_meal_image
)

logger = logging.getLogger(__name__)

router = APIRouter()

class AgentRequest(BaseModel):
    """Request model for agent queries."""
    prompt: str
    session_id: Optional[str] = None

class AgentResponse(BaseModel):
    """Response model for agent queries."""
    response: str
    source: Optional[str] = None  # "ai" or "web"
    session_id: Optional[str] = None

class WorkoutPlanRequest(BaseModel):
    """Request model for workout plan generation."""
    days: int = 7
    session_id: Optional[str] = None

class NutritionAnalysisRequest(BaseModel):
    """Request model for nutrition analysis."""
    food_description: str
    session_id: Optional[str] = None

@router.post("/ask_agent", response_model=AgentResponse)
async def ask_agent_route(
    request: AgentRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Ask the HyperAI agent a question with conversation memory.
    Returns AI-powered responses with optional web search integration.
    """
    try:
        logger.info(f"Agent query from user {current_user.id}: {request.prompt[:100]}")
        
        # Use user ID as default session ID if not provided
        session_id = request.session_id or f"user_{current_user.id}"
        
        # Run agent in thread pool (async wrapper for sync function)
        response_text = await asyncio.to_thread(
            ask_agent,
            request.prompt,
            current_user,
            session_id
        )
        
        return AgentResponse(
            response=response_text,
            source="ai",
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Error in ask_agent_route: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing agent request: {str(e)}"
        )

@router.post("/generate_workout_plan")
async def generate_workout_plan_route(
    request: WorkoutPlanRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate a structured workout plan.
    Returns JSON-formatted workout plan with exercises, sets, reps, etc.
    """
    try:
        session_id = request.session_id or f"user_{current_user.id}"
        
        plan = await asyncio.to_thread(
            generate_workout_plan,
            request.days,
            current_user,
            session_id
        )
        
        return {"plan": plan, "days": request.days}
        
    except Exception as e:
        logger.error(f"Error generating workout plan: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating workout plan: {str(e)}"
        )

@router.post("/analyze_nutrition")
async def analyze_nutrition_route(
    request: NutritionAnalysisRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze nutrition and return macros.
    Returns JSON with calories, protein, carbs, fat, etc.
    """
    try:
        session_id = request.session_id or f"user_{current_user.id}"
        
        analysis = await asyncio.to_thread(
            analyze_nutrition,
            request.food_description,
            current_user,
            session_id
        )
        
        return {"analysis": analysis}
        
    except Exception as e:
        logger.error(f"Error analyzing nutrition: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing nutrition: {str(e)}"
        )

@router.post("/analyze_meal_image")
async def analyze_meal_image_route(
    file: UploadFile = File(...),
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze meal from image using OpenAI Vision.
    Returns JSON with food identification, calories, macros, etc.
    """
    try:
        # Read image file
        image_data = await file.read()
        
        # Use user ID as default session ID if not provided
        if not session_id:
            session_id = f"user_{current_user.id}"
        
        # Analyze image
        analysis = await asyncio.to_thread(
            analyze_meal_image,
            image_data,
            current_user,
            session_id
        )
        
        return {"analysis": analysis}
        
    except Exception as e:
        logger.error(f"Error analyzing meal image: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing meal image: {str(e)}"
        )


