"""
Chat Assistant API Routes
Endpoints for LLM-powered fitness and nutrition advice.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
import logging

from backend.core.database import get_db
from backend.core.auth import get_current_active_user
from database.models.user import User
from database.models.ai_log import AILog
from ai_modules.chat_assistant.openai_chat import get_chat_assistant_service
from backend.models.chat import (
    ChatMessage,
    ChatResponse,
    ChatHistoryResponse,
    ConversationCreate
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    message: ChatMessage,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI fitness assistant.
    
    Send a message and receive personalized fitness/nutrition advice.
    """
    try:
        chat_service = get_chat_assistant_service()
        
        # Prepare user data for context
        user_data = {
            "age": current_user.age,
            "height": current_user.height,
            "weight": current_user.weight,
            "gender": current_user.gender,
            "activity_level": current_user.activity_level,
            "fitness_goals": current_user.fitness_goals,
            "dietary_preferences": current_user.dietary_preferences,
            "allergies": current_user.allergies
        }
        
        # Get conversation history if provided
        conversation_history = message.conversation_history or []
        
        logger.info(f"Chat request from user {current_user.id}: {message.content[:100]}")
        
        # Generate response
        result = await chat_service.chat(
            message=message.content,
            conversation_history=conversation_history,
            user_data=user_data,
            user_id=current_user.id
        )
        
        # Log AI interaction
        try:
            ai_log = AILog(
                user_id=current_user.id,
                interaction_type="chat_assistant",
                model_used=result["model"],
                input_data=json.dumps({
                    "message": message.content,
                    "has_history": len(conversation_history) > 0
                }),
                output_data=json.dumps({
                    "response": result["response"],
                    "tokens_used": result["tokens_used"]
                }),
                tokens_used=result["tokens_used"],
                processing_time_ms=int(result["processing_time_seconds"] * 1000),
                confidence_score=1.0,  # Chat doesn't have confidence score
                is_successful=True
            )
            db.add(ai_log)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to create AI log: {e}")
        
        # Build response
        response = ChatResponse(
            response=result["response"],
            conversation_id=None,  # Could implement conversation tracking
            tokens_used=result["tokens_used"],
            model=result["model"]
        )
        
        logger.info(f"Chat response sent to user {current_user.id}")
        
        return response
    
    except ValueError as e:
        logger.error(f"Validation error in chat: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in chat assistant: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating chat response: {str(e)}"
        )

@router.get("/chat/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history for the current user.
    
    Returns recent AI interactions from the AI log.
    """
    try:
        # Get recent chat interactions from AI log
        recent_logs = db.query(AILog).filter(
            AILog.user_id == current_user.id,
            AILog.interaction_type == "chat_assistant"
        ).order_by(AILog.created_at.desc()).limit(limit).all()
        
        history = []
        for log in recent_logs:
            try:
                input_data = json.loads(log.input_data) if log.input_data else {}
                output_data = json.loads(log.output_data) if log.output_data else {}
                
                history.append(ChatHistoryResponse(
                    message=input_data.get("message", ""),
                    response=output_data.get("response", ""),
                    created_at=log.created_at.isoformat() if log.created_at else None,
                    tokens_used=log.tokens_used or 0
                ))
            except json.JSONDecodeError:
                continue
        
        return list(reversed(history))  # Return in chronological order
    
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching chat history: {str(e)}"
        )

@router.post("/chat/stream")
async def chat_with_assistant_stream(
    message: ChatMessage,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Stream chat responses (for real-time chat experience).
    
    Note: This is a placeholder for streaming implementation.
    Streaming requires WebSocket or SSE (Server-Sent Events).
    """
    # For now, return regular response
    # TODO: Implement streaming with OpenAI streaming API
    return await chat_with_assistant(message, current_user, db)
