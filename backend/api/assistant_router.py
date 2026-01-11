"""AI assistant routes."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, status
from pydantic import BaseModel

from backend.api.dependencies import get_current_user
from backend.core.rate_limit import limiter
from backend.models.user import User
from backend.services.assistant_service import get_ai_assistant_service

router = APIRouter()


class AssistantMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_with_assistant(
    request: Request,
    payload: AssistantMessage,
    current_user: User = Depends(get_current_user),
):
    """Send a chat message to the AI assistant with personalized context."""
    try:
        service = get_ai_assistant_service()
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI assistant service is not available. LangChain dependencies are missing.\n\n"
                "To fix this, run:\n"
                "1. ./install_langchain.sh\n"
                "OR\n"
                "2. pip install langchain langchain-openai langchain-core\n\n"
                "Then restart your backend server."
            )
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize AI assistant: {str(e)}"
        ) from e

    try:
        message = payload.message
        
        # Pass context directly to the service for personalized prompt building
        result = await service.chat(
            user=current_user, 
            message=message,
            context=payload.context
        )
        return result
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in chat_with_assistant: {str(e)}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        ) from e


@router.websocket("/ws/assistant")
async def assistant_websocket(websocket: WebSocket, token: Optional[str] = None):
    """Placeholder assistant WebSocket endpoint (future extension)."""

    await websocket.accept()
    await websocket.send_json({"message": "Assistant WebSocket not implemented yet"})
    await websocket.close()









