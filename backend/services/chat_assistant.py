"""LangChain powered AI assistant for HyperFit."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Optional

from typing import TYPE_CHECKING

try:  # pragma: no cover - optional dependency guard
    from langchain_core.tools import StructuredTool
    from langchain_core.messages import HumanMessage, AIMessage
    from langchain_openai import ChatOpenAI
    from langgraph.prebuilt import create_react_agent
    _langchain_import_error: Optional[ImportError] = None
except ImportError as exc:  # pragma: no cover
    StructuredTool = HumanMessage = AIMessage = ChatOpenAI = create_react_agent = None  # type: ignore[assignment]
    _langchain_import_error = exc

if TYPE_CHECKING:  # pragma: no cover
    from langchain_core.tools import StructuredTool  # noqa: F401
    from langchain_openai import ChatOpenAI  # noqa: F401

from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.food import FoodLog
from backend.models.user import User
from backend.models.workout import Workout


class AIAssistantService:
    """Thin wrapper around a LangChain agent exposing HyperFit domain tools."""

    def __init__(self) -> None:
        if _langchain_import_error:
            raise ImportError(
                "LangChain dependencies are required for the AI assistant. "
                "Install the optional extras with `pip install -r requirements.txt` "
                "before accessing /api/assistant."
            ) from _langchain_import_error

        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for the AI assistant")

        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.4,
            openai_api_key=settings.openai_api_key,
        )

        self._active_user: Optional[User] = None
        self.tools = [
            StructuredTool.from_function(
                func=self._tool_track_workout,
                name="track_workout",
                description=(
                    "Retrieve the most recent workout analysis for the authenticated user. "
                    "Use when the user asks about workout performance, reps, or AI form feedback."
                ),
            ),
            StructuredTool.from_function(
                func=self._tool_analyze_meal,
                name="analyze_meal",
                description=(
                    "Summarize the latest AI nutrition analysis for the authenticated user."
                ),
            ),
        ]

        # Create agent using langgraph's create_react_agent (replaces deprecated initialize_agent)
        self.agent = create_react_agent(self.llm, self.tools)

    def _tool_track_workout(self, _: str) -> str:
        if not self._active_user:
            return "No authenticated user context available."

        with session_scope() as session:
            workout = (
                session.query(Workout)
                .filter(Workout.user_id == self._active_user.id)
                .order_by(Workout.created_at.desc())
                .first()
            )

            if not workout:
                return "No workout records found yet. Invite the user to upload a session."

            summary = {
                "workout_type": workout.workout_type,
                "duration_minutes": workout.duration_minutes,
                "calories_burned": workout.calories_burned,
                "ai_summary": workout.ai_summary,
                "exercises": [
                    {
                        "name": exercise.name,
                        "sets": exercise.sets,
                        "reps": exercise.reps,
                        "confidence": exercise.confidence,
                    }
                    for exercise in workout.exercises
                ],
            }
            return json.dumps(summary)

    def _tool_analyze_meal(self, _: str) -> str:
        if not self._active_user:
            return "No authenticated user context available."

        with session_scope() as session:
            log = (
                session.query(FoodLog)
                .filter(FoodLog.user_id == self._active_user.id)
                .order_by(FoodLog.created_at.desc())
                .first()
            )

            if not log:
                return "No food analysis records yet. Encourage the user to upload a meal photo."

            payload = {
                "total_calories": log.total_calories,
                "macronutrients": log.macronutrients,
                "food_items": log.food_items,
                "confidence_score": log.confidence_score,
            }
            return json.dumps(payload)

    async def chat(self, *, user: User, message: str) -> Dict[str, Any]:
        """Run an agent conversation for the provided message."""

        self._active_user = user

        def _run_agent() -> str:
            # Use langgraph's invoke API (replaces deprecated agent.run)
            result = self.agent.invoke(
                {"messages": [HumanMessage(content=message)]}
            )
            # Extract the response from the messages
            if isinstance(result, dict) and "messages" in result:
                messages = result["messages"]
                # Find the last AI message
                for msg in reversed(messages):
                    if hasattr(msg, "content") and isinstance(msg, AIMessage):
                        return str(msg.content)
                # Fallback to last message
                if messages and hasattr(messages[-1], "content"):
                    return str(messages[-1].content)
            return str(result)

        response = await asyncio.to_thread(_run_agent)
        self._active_user = None
        return {"response": response}


assistant_service: Optional[AIAssistantService] = None


def get_ai_assistant_service() -> AIAssistantService:
    global assistant_service
    if assistant_service is None:
        assistant_service = AIAssistantService()
    return assistant_service

