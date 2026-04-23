"""User context building and thread-local user storage for the AI assistant.

Pure-Python module: no LangChain deps, no DB access. These helpers live
outside the agent so they can be reused by both the direct-LLM path and
the agent path, and so tools can reach the "currently authenticated user"
without threading a parameter through every call site.
"""

from __future__ import annotations

import json
import threading
from typing import Any

from backend.models.user import User

# Thread-local storage for the user context. Set per request in
# AIAssistantService.chat() and cleared in its finally block so workers
# cannot leak user context across requests.
_thread_local = threading.local()


def get_active_user() -> User | None:
    """Return the active user for the current thread, or None if unset."""
    return getattr(_thread_local, "user", None)


def set_active_user(user: User | None) -> None:
    """Set or clear the active user for the current thread."""
    _thread_local.user = user


def build_personalized_prompt(
    user: User, message: str, context: dict[str, Any] | None = None
) -> str:
    """Build a personalized system+user prompt for the LangGraph agent path.

    Uses the user's profile (weight, height, activity level, fitness goals,
    dietary preferences) plus any extra `context` dict passed from the
    frontend to produce a German-language coach persona prompt.
    """
    first_name = (user.full_name or user.username or "du").split(" ")[0]

    profile_parts: list[str] = []
    if user.weight_kg:
        profile_parts.append(f"Gewicht: {user.weight_kg}kg")
    if user.height_cm:
        profile_parts.append(f"Größe: {user.height_cm}cm")
    if user.activity_level:
        profile_parts.append(f"Aktivitätslevel: {user.activity_level}")
    if user.fitness_goals:
        try:
            goals = (
                json.loads(user.fitness_goals)
                if isinstance(user.fitness_goals, str)
                else user.fitness_goals
            )
            if isinstance(goals, list) and goals:
                profile_parts.append(f"Fitness-Ziele: {', '.join(goals)}")
            elif goals:
                profile_parts.append(f"Fitness-Ziele: {goals}")
        except (json.JSONDecodeError, TypeError):
            if user.fitness_goals:
                profile_parts.append(f"Fitness-Ziele: {user.fitness_goals}")
    if user.dietary_preferences:
        try:
            prefs = (
                json.loads(user.dietary_preferences)
                if isinstance(user.dietary_preferences, str)
                else user.dietary_preferences
            )
            if isinstance(prefs, list) and prefs:
                profile_parts.append(f"Ernährungspräferenzen: {', '.join(prefs)}")
            elif prefs:
                profile_parts.append(f"Ernährungspräferenzen: {prefs}")
        except (json.JSONDecodeError, TypeError):
            if user.dietary_preferences:
                profile_parts.append(f"Ernährungspräferenzen: {user.dietary_preferences}")

    profile_str = "\n".join(profile_parts) if profile_parts else "Noch keine Profildaten vorhanden."

    context_str = ""
    if context:
        context_parts: list[str] = []
        if context.get("first_name"):
            first_name = context["first_name"]
        if context.get("fitness_goals"):
            context_parts.append(f"Ziele: {context['fitness_goals']}")
        if context.get("dietary_preferences"):
            context_parts.append(f"Ernährung: {context['dietary_preferences']}")
        if context_parts:
            context_str = "\n" + "\n".join(context_parts)

    return f"""Du bist der persönliche Fitness-Coach von {first_name} in der HYPERFIT App.

DEINE ROLLE:
Du bist {first_name}s vertrauenswürdiger Trainingspartner - motivierend, kompetent und immer auf Augenhöhe. Du kombinierst Fachwissen mit einer freundschaftlichen Art.

KOMMUNIKATION:
- Duze {first_name} immer und sprich wie ein guter Freund
- Sei motivierend aber authentisch - keine übertriebenen Floskeln
- Halte Antworten kurz und prägnant (max. 2-3 Absätze)
- Nutze gelegentlich Emojis für Motivation 💪

FACHGEBIETE:
- Trainingsplanung und Übungsausführung
- Ernährung und Makronährstoffe
- Regeneration und Schlaf
- Motivation und Zielsetzung

TOOL-NUTZUNG:
- Nutze Tools NUR für {first_name}s persönliche Daten (Workouts, Mahlzeiten, Check-Ins)
- Allgemeine Fitness-Fragen beantwortest du direkt aus deinem Wissen

{first_name}s Profil:
{profile_str}{context_str}

Frage: {message}"""


def build_direct_profile_block(user: User, context: dict[str, Any] | None = None) -> tuple[str, str, str]:
    """Build (first_name, profile_str, context_str) for the direct-LLM path.

    Separate from build_personalized_prompt because the direct path uses a
    ChatPromptTemplate and needs the pieces separately.
    """
    first_name = (user.full_name or user.username or "du").split(" ")[0]
    profile_parts: list[str] = []
    if user.weight_kg:
        profile_parts.append(f"Gewicht: {user.weight_kg}kg")
    if user.height_cm:
        profile_parts.append(f"Größe: {user.height_cm}cm")
    if user.activity_level:
        profile_parts.append(f"Aktivitätslevel: {user.activity_level}")
    profile_str = "\n".join(profile_parts) if profile_parts else "Noch keine Profildaten vorhanden."

    context_str = ""
    if context and isinstance(context, dict):
        context_parts: list[str] = []
        if "check_in_data" in context:
            check_in = context["check_in_data"]
            if "adherence" in check_in:
                context_parts.append(
                    f"Compliance: {'Gut eingehalten' if check_in['adherence'] else 'Nicht so gut eingehalten'}"
                )
            if "weight" in check_in:
                context_parts.append(f"Gewicht: {check_in['weight']}kg")
            if "bodyFat" in check_in:
                context_parts.append(f"Körperfett: {check_in['bodyFat']}%")
            if "goal" in check_in:
                context_parts.append(f"Ziel: {check_in['goal']}")
            if "caloriesPrevious" in check_in:
                context_parts.append(f"Aktuelles Kalorienziel: {check_in['caloriesPrevious']} kcal")
        if context_parts:
            context_str = "\n\nCheck-In Daten:\n" + "\n".join(f"- {part}" for part in context_parts)

    return first_name, profile_str, context_str


def needs_tools(message: str) -> bool:
    """Return True if the message likely requires user-specific tool data."""
    message_lower = message.lower()
    # Check-in analysis flows through the direct path — context is injected.
    if (
        "check-in durchführen" in message_lower
        or "check-in machen" in message_lower
        or "weekly check-in" in message_lower
    ):
        return False
    tool_keywords = (
        "mein workout",
        "meine workouts",
        "letztes workout",
        "workout daten",
        "meine mahlzeit",
        "letzte mahlzeit",
        "meal analyse",
        "mahlzeit analyse",
        "check-in status",
        "meine kalorien",
        "mein ziel",
        "meine compliance",
        "mein fortschritt",
    )
    return any(keyword in message_lower for keyword in tool_keywords)
