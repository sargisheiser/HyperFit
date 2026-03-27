"""
OpenAI Chat Assistant Service
Provides fitness and nutrition advice using OpenAI's GPT models.
"""

import logging
import time
from typing import Any

from backend.core.config import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

class ChatAssistantService:
    """Service for providing fitness and nutrition advice via LLM."""

    def __init__(self):
        """Initialize OpenAI client."""
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model or "gpt-4o-mini"

        # System prompt for fitness assistant (German)
        self.system_prompt = """Du bist HYPERFIT, dein intelligenter Fitness- und Ernährungsassistent.

EXPERTISE:
- Trainingspläne und Übungen
- Ernährung und Mahlzeitenplanung
- Fortschrittsverfolgung
- Technik und Ausführung

STIL:
- Motivierend und unterstützend
- Praktische, umsetzbare Tipps
- Wissenschaftlich fundiert aber verständlich
- Sicherheit und korrekte Ausführung haben Priorität

Antworte immer auf Deutsch. Halte dich kurz aber informativ. Frag nach, wenn du mehr Infos brauchst."""

        logger.info(f"Chat Assistant initialized with model: {self.model}")

    def _get_user_context(self, user_data: dict[str, Any] | None = None) -> str:
        """Build user context string from user data."""
        if not user_data:
            return ""

        context_parts = []

        if user_data.get("age"):
            context_parts.append(f"Alter: {user_data['age']}")
        if user_data.get("height"):
            context_parts.append(f"Größe: {user_data['height']} cm")
        if user_data.get("weight"):
            context_parts.append(f"Gewicht: {user_data['weight']} kg")
        if user_data.get("gender"):
            gender_map = {"male": "männlich", "female": "weiblich", "other": "divers"}
            context_parts.append(f"Geschlecht: {gender_map.get(user_data['gender'], user_data['gender'])}")
        if user_data.get("activity_level"):
            level_map = {"sedentary": "wenig aktiv", "light": "leicht aktiv", "moderate": "moderat aktiv", "active": "aktiv", "very_active": "sehr aktiv"}
            context_parts.append(f"Aktivitätslevel: {level_map.get(user_data['activity_level'], user_data['activity_level'])}")
        if user_data.get("fitness_goals"):
            goals = user_data['fitness_goals']
            if isinstance(goals, str):
                context_parts.append(f"Fitness-Ziele: {goals}")
            elif isinstance(goals, list):
                context_parts.append(f"Fitness-Ziele: {', '.join(goals)}")
        if user_data.get("dietary_preferences"):
            prefs = user_data['dietary_preferences']
            if isinstance(prefs, str):
                context_parts.append(f"Ernährung: {prefs}")
            elif isinstance(prefs, list):
                context_parts.append(f"Ernährung: {', '.join(prefs)}")
        if user_data.get("allergies"):
            allergies = user_data['allergies']
            if isinstance(allergies, str):
                context_parts.append(f"Allergien: {allergies}")
            elif isinstance(allergies, list):
                context_parts.append(f"Allergien: {', '.join(allergies)}")

        if context_parts:
            return "\nNutzerprofil:\n" + "\n".join(f"- {part}" for part in context_parts)
        return ""

    async def chat(
        self,
        message: str,
        conversation_history: list[dict[str, str]] | None = None,
        user_data: dict[str, Any] | None = None,
        user_id: int | None = None
    ) -> dict[str, Any]:
        """
        Generate a chat response using OpenAI.

        Args:
            message: User's message
            conversation_history: Previous messages in format [{"role": "user", "content": "..."}, ...]
            user_data: Optional user profile data for context
            user_id: Optional user ID for logging

        Returns:
            Dictionary with response, tokens used, and metadata
        """
        start_time = time.time()

        try:
            # Build conversation messages
            messages = [{"role": "system", "content": self.system_prompt}]

            # Add user context if available
            user_context = self._get_user_context(user_data)
            if user_context:
                messages.append({
                    "role": "system",
                    "content": user_context
                })

            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-10:]:  # Limit to last 10 messages
                    if isinstance(msg, dict) and "role" in msg and "content" in msg:
                        messages.append({
                            "role": msg["role"],
                            "content": msg["content"]
                        })

            # Add current message
            messages.append({"role": "user", "content": message})

            logger.info(f"Chat request from user {user_id}: {message[:50]}...")

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                top_p=0.9,
                frequency_penalty=0.3,
                presence_penalty=0.3
            )

            assistant_message = response.choices[0].message.content
            usage = response.usage

            processing_time = time.time() - start_time

            result = {
                "response": assistant_message,
                "tokens_used": usage.total_tokens if usage else 0,
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "model": self.model,
                "processing_time_seconds": processing_time,
                "conversation_id": None  # Could be generated for multi-turn conversations
            }

            logger.info(f"Chat response generated in {processing_time:.2f}s, tokens: {result['tokens_used']}")

            return result

        except Exception as e:
            logger.error(f"Error in chat assistant: {e}", exc_info=True)
            raise

    def estimate_cost(self, tokens: int) -> float:
        """Estimate cost based on tokens and model."""
        # Rough cost estimates per 1K tokens (as of 2024)
        # These are approximate and may vary
        cost_per_1k_tokens = {
            "gpt-4o-mini": 0.15 / 1000,  # $0.15 per 1M input, $0.60 per 1M output
            "gpt-4o": 2.50 / 1000,  # $2.50 per 1M input, $10 per 1M output
            "gpt-4": 30.0 / 1000,  # $30 per 1M input, $60 per 1M output
        }

        rate = cost_per_1k_tokens.get(self.model, 0.15 / 1000)
        return tokens * rate

# Global service instance
_chat_service: ChatAssistantService | None = None

def get_chat_assistant_service() -> ChatAssistantService:
    """Get or create the chat assistant service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatAssistantService()
    return _chat_service
