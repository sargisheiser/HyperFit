"""LangGraph agent setup and chat execution for the AI assistant."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any

try:  # pragma: no cover - optional dependency guard
    from langchain_core.messages import AIMessage, HumanMessage
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_openai import ChatOpenAI
    from langgraph.prebuilt import create_react_agent
    _langchain_import_error: ImportError | None = None
except ImportError as exc:  # pragma: no cover
    AIMessage = HumanMessage = ChatPromptTemplate = ChatOpenAI = create_react_agent = None  # type: ignore[assignment]
    _langchain_import_error = exc

if TYPE_CHECKING:  # pragma: no cover
    from langchain_core.prompts import ChatPromptTemplate  # noqa: F401
    from langchain_openai import ChatOpenAI  # noqa: F401

from backend.core.config import settings
from backend.models.user import User
from backend.services.assistant_context import (
    build_direct_profile_block,
    build_personalized_prompt,
    needs_tools,
    set_active_user,
)
from backend.services.assistant_tools import build_tools

logger = logging.getLogger(__name__)


class AIAssistantService:
    """Thin wrapper around a LangChain agent exposing HyperFit domain tools."""

    def __init__(self) -> None:
        if _langchain_import_error:
            raise ImportError(
                "LangChain dependencies are required for the AI assistant. "
                "Install the optional extras with `pip install -r requirements.txt` "
                "before accessing /assistant endpoints."
            ) from _langchain_import_error

        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for the AI assistant")

        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.7,
            openai_api_key=settings.openai_api_key,
        )
        self.tools = build_tools()
        self.agent = create_react_agent(self.llm, self.tools)

    async def _direct_llm_response(
        self, user: User, message: str, context: dict[str, Any] | None = None
    ) -> str:
        """Answer without invoking the agent — faster, no iteration limits."""
        if ChatPromptTemplate is None:
            raise ImportError("ChatPromptTemplate not available")

        first_name, profile_str, context_str = build_direct_profile_block(user, context)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    f"""Du bist {first_name}s persönlicher Fitness-Coach bei HYPERFIT.

Profil: {profile_str}
{context_str}

Regeln:
- Antworte auf Deutsch, kurz und motivierend
- Gib konkrete Empfehlungen mit Zahlen (Kalorien, Wiederholungen, etc.)
- Duze {first_name} immer""",
                ),
                ("human", "{question}"),
            ]
        )

        chain = prompt | self.llm
        response = await asyncio.to_thread(lambda: chain.invoke({"question": message}).content)
        return response

    async def chat(
        self, *, user: User, message: str, context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Run a conversation turn — direct path for chit-chat, agent for tool calls."""
        set_active_user(user)

        try:
            if not needs_tools(message):
                try:
                    response = await self._direct_llm_response(user, message, context)
                    return {"response": response}
                except Exception as e:
                    logger.warning("Direct LLM failed, falling back to agent: %s", e)

            def _run_agent() -> str:
                try:
                    personalized_message = build_personalized_prompt(user, message, context)
                    result = self.agent.invoke(
                        {"messages": [HumanMessage(content=personalized_message)]}
                    )
                    if isinstance(result, dict) and "messages" in result:
                        messages = result["messages"]
                        for msg in reversed(messages):
                            if hasattr(msg, "content") and isinstance(msg, AIMessage):
                                return str(msg.content)
                        if messages:
                            last_msg = messages[-1]
                            if hasattr(last_msg, "content"):
                                return str(last_msg.content)
                    if not isinstance(result, str):
                        return str(result)
                    return result
                except Exception as agent_error:
                    error_str = str(agent_error)

                    if (
                        "iteration limit" in error_str.lower()
                        or "time limit" in error_str.lower()
                        or "stopped due to" in error_str.lower()
                    ):
                        first_name = (user.full_name or user.username or "du").split(" ")[0]
                        return (
                            f"Entschuldigung {first_name}, ich brauche etwas mehr Zeit für diese Anfrage. "
                            "Könntest du die Frage etwas spezifischer formulieren oder in kleinere Fragen aufteilen?"
                        )

                    if (
                        "parsing error" in error_str.lower()
                        or "could not parse" in error_str.lower()
                    ):
                        if "This is the error:" in error_str:
                            parts = error_str.split("This is the error:")
                            if len(parts) > 1:
                                actual_response = parts[1].strip().strip("`").strip()
                                if actual_response:
                                    return actual_response
                        first_name = (user.full_name or user.username or "du").split(" ")[0]
                        return (
                            f"Entschuldigung {first_name}, ich hatte ein Problem beim Verarbeiten deiner Anfrage. "
                            "Könntest du die Frage anders formulieren?"
                        )

                    logger.error("Agent execution error: %s", agent_error, exc_info=True)
                    raise RuntimeError(f"Agent execution failed: {agent_error!s}") from agent_error

            response = await asyncio.to_thread(_run_agent)
            return {"response": response}
        except Exception as e:
            error_str = str(e)
            logger.error("Error in chat method: %s", e, exc_info=True)

            if any(
                keyword in error_str.lower()
                for keyword in (
                    "quota",
                    "insufficient_quota",
                    "rate_limit",
                    "429",
                    "authentication",
                    "invalid_api_key",
                    "401",
                )
            ):
                first_name = (user.full_name or user.username or "du").split(" ")[0]
                return {
                    "response": (
                        f"Entschuldigung {first_name}, der KI-Dienst ist momentan nicht verfügbar. "
                        "Bitte versuche es später erneut. 🔧"
                    )
                }

            raise RuntimeError(f"Chat processing failed: {error_str}") from e
        finally:
            set_active_user(None)


_assistant_service: AIAssistantService | None = None


def get_ai_assistant_service() -> AIAssistantService:
    """Return singleton assistant service instance."""
    global _assistant_service
    if _assistant_service is None:
        _assistant_service = AIAssistantService()
    return _assistant_service
