"""
Chat Assistant Module - LLM-powered fitness and nutrition advice
"""

from ai_modules.chat_assistant.openai_chat import (
    ChatAssistantService,
    get_chat_assistant_service
)

__all__ = [
    "ChatAssistantService",
    "get_chat_assistant_service"
]