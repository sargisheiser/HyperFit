"\"\"\"LangChain powered AI assistant for HyperFit.\"\"\""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Any, Dict, Optional

from typing import TYPE_CHECKING

try:  # pragma: no cover - optional dependency guard
    from langchain.agents import AgentType, Tool, initialize_agent
    from langchain.prompts import ChatPromptTemplate
    from langchain_openai import ChatOpenAI
    _langchain_import_error: Optional[ImportError] = None
except ImportError as exc:  # pragma: no cover
    AgentType = Tool = initialize_agent = ChatOpenAI = ChatPromptTemplate = None  # type: ignore[assignment]
    _langchain_import_error = exc

if TYPE_CHECKING:  # pragma: no cover
    from langchain.agents import AgentType, Tool, initialize_agent  # noqa: F401
    from langchain.prompts import ChatPromptTemplate  # noqa: F401
    from langchain_openai import ChatOpenAI  # noqa: F401

from backend.core.config import settings
from backend.core.database import session_scope
from backend.models.food import FoodLog
from backend.models.nutrition import DailyNutrition, NutritionCheckIn
from backend.models.user import User
from backend.models.workout import Workout
from backend.schemas.nutrition import CheckIn
from backend.services.nutrition_service import record_checkin


# Thread-local storage for user context to ensure thread safety
_thread_local = threading.local()


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
            temperature=0.7,  # Higher temperature for more natural, conversational responses
            openai_api_key=settings.openai_api_key,
        )

        self.tools = [
            Tool(
                name="track_workout",
                func=self._tool_track_workout,
                description=(
                    "ONLY use this tool when the user explicitly asks about their SPECIFIC workout data, "
                    "reps, sets, or form feedback from a past workout. "
                    "DO NOT use for general workout advice or questions."
                ),
            ),
            Tool(
                name="analyze_meal",
                func=self._tool_analyze_meal,
                description=(
                    "ONLY use this tool when the user asks about their SPECIFIC meal analysis data. "
                    "DO NOT use for general nutrition advice or meal planning questions."
                ),
            ),
            Tool(
                name="get_checkin_status",
                func=self._tool_get_checkin_status,
                description=(
                    "ONLY use this tool when the user explicitly asks about their check-in status, "
                    "calorie goals, or compliance numbers. "
                    "DO NOT use for general nutrition or goal-setting questions."
                ),
            ),
            Tool(
                name="submit_checkin",
                func=self._tool_submit_checkin,
                description=(
                    "ONLY use this tool when the user explicitly wants to SUBMIT or CREATE a check-in. "
                    "The input must be a JSON string with: goal (build/maintain/recomp/lose), "
                    "body_fat (0-100), calories_previous (current goal), calories_new (new goal), "
                    "and optionally compliance (0-100)."
                ),
            ),
        ]

        # Create agent with personalized system message
        # Handle parsing errors gracefully to prevent crashes
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=False,
            handle_parsing_errors=True,  # Handle LLM output parsing errors gracefully
        )
        
        # Configure agent limits after initialization
        # initialize_agent returns an AgentExecutor which has max_iterations
        # Increase max_iterations significantly to allow more reasoning steps
        if hasattr(self.agent, 'max_iterations'):
            self.agent.max_iterations = 50  # Increased for complex check-in analysis
        if hasattr(self.agent, 'max_execution_time'):
            self.agent.max_execution_time = 180  # 180 seconds timeout (3 minutes)
        # Also try to set via agent_executor if available
        if hasattr(self.agent, 'agent_executor'):
            if hasattr(self.agent.agent_executor, 'max_iterations'):
                self.agent.agent_executor.max_iterations = 50
            if hasattr(self.agent.agent_executor, 'max_execution_time'):
                self.agent.agent_executor.max_execution_time = 180

    def _get_active_user(self) -> Optional[User]:
        """Get the active user from thread-local storage."""
        return getattr(_thread_local, "user", None)

    def _set_active_user(self, user: Optional[User]) -> None:
        """Set the active user in thread-local storage."""
        _thread_local.user = user

    def _tool_track_workout(self, _: str) -> str:
        """Tool to retrieve the most recent workout for the authenticated user."""
        user = self._get_active_user()
        if not user:
            return "No authenticated user context available."

        try:
            with session_scope() as session:
                workout = (
                    session.query(Workout)
                    .filter(Workout.user_id == user.id)
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
                return json.dumps(summary, default=str)
        except Exception as e:
            return f"Error retrieving workout data: {str(e)}"

    def _tool_analyze_meal(self, _: str) -> str:
        """Tool to retrieve the most recent meal analysis for the authenticated user."""
        user = self._get_active_user()
        if not user:
            return "No authenticated user context available."

        try:
            with session_scope() as session:
                log = (
                    session.query(FoodLog)
                    .filter(FoodLog.user_id == user.id)
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
                return json.dumps(payload, default=str)
        except Exception as e:
            return f"Error retrieving meal data: {str(e)}"

    def _tool_get_checkin_status(self, _: str) -> str:
        """Tool to retrieve the latest check-in status for the authenticated user."""
        user = self._get_active_user()
        if not user:
            return "No authenticated user context available."

        try:
            with session_scope() as session:
                checkin = (
                    session.query(NutritionCheckIn)
                    .filter(NutritionCheckIn.user_id == user.id)
                    .order_by(NutritionCheckIn.date.desc())
                    .first()
                )

                daily = (
                    session.query(DailyNutrition)
                    .filter(DailyNutrition.user_id == user.id)
                    .order_by(DailyNutrition.date.desc())
                    .first()
                )

                if not checkin and not daily:
                    return "No check-in records found yet. The user can start a check-in to set their nutrition goals."

                result = {}
                if checkin:
                    result.update({
                        "last_checkin_date": checkin.date.isoformat() if checkin.date else None,
                        "goal": checkin.goal,
                        "body_fat": checkin.body_fat,
                        "calories_previous": checkin.calories_previous,
                        "calories_new": checkin.calories_new,
                        "calories_change": checkin.calories_change,
                        "compliance": checkin.compliance,
                    })
                
                if daily:
                    result.update({
                        "current_calories_goal": daily.calories_goal,
                        "current_calories_consumed": daily.calories_consumed,
                        "current_weight": daily.weight,
                        "current_compliance": daily.compliance,
                    })

                return json.dumps(result, default=str)
        except Exception as e:
            return f"Error retrieving check-in status: {str(e)}"

    def _tool_submit_checkin(self, input_str: str) -> str:
        """Tool to submit a nutrition check-in for the authenticated user."""
        user = self._get_active_user()
        if not user:
            return "No authenticated user context available."

        try:
            # Parse JSON input
            try:
                checkin_data = json.loads(input_str)
            except json.JSONDecodeError:
                return "Invalid JSON format. Please provide a valid JSON string with goal, body_fat, calories_previous, calories_new, and optionally compliance."

            # Validate required fields
            required_fields = ["goal", "calories_previous", "calories_new"]
            missing_fields = [field for field in required_fields if field not in checkin_data]
            if missing_fields:
                return f"Missing required fields: {', '.join(missing_fields)}"

            # Get current daily nutrition to use as fallback for calories_previous
            with session_scope() as session:
                daily = (
                    session.query(DailyNutrition)
                    .filter(DailyNutrition.user_id == user.id)
                    .order_by(DailyNutrition.date.desc())
                    .first()
                )

                # Use daily calories_goal if calories_previous not provided or use provided value
                calories_previous = checkin_data.get("calories_previous")
                if not calories_previous and daily:
                    calories_previous = daily.calories_goal
                elif not calories_previous:
                    return "Could not determine previous calories. Please provide calories_previous."

                # Create CheckIn payload
                checkin_payload = CheckIn(
                    user_id=user.id,
                    goal=checkin_data["goal"],
                    body_fat=checkin_data.get("body_fat", 15.0),
                    calories_previous=float(calories_previous),
                    calories_new=float(checkin_data["calories_new"]),
                    compliance=checkin_data.get("compliance"),
                )

                # Submit check-in
                result = record_checkin(checkin_payload, session)
                
                return json.dumps({
                    "status": "success",
                    "message": f"Check-in erfolgreich durchgeführt! Neues Kalorienziel: {result.calories_new} kcal",
                    "checkin": {
                        "id": result.id,
                        "date": result.date.isoformat() if result.date else None,
                        "goal": result.goal,
                        "calories_new": result.calories_new,
                        "calories_change": result.calories_change,
                    }
                }, default=str)
        except ValueError as e:
            return f"Validation error: {str(e)}"
        except Exception as e:
            return f"Error submitting check-in: {str(e)}"

    def _build_personalized_prompt(self, user: User, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Build a personalized prompt with user context to make responses more individual."""
        first_name = (user.full_name or user.username or "du").split(' ')[0]
        
        # Build user profile context
        profile_parts = []
        if user.weight_kg:
            profile_parts.append(f"Gewicht: {user.weight_kg}kg")
        if user.height_cm:
            profile_parts.append(f"Größe: {user.height_cm}cm")
        if user.activity_level:
            profile_parts.append(f"Aktivitätslevel: {user.activity_level}")
        if user.fitness_goals:
            try:
                goals = json.loads(user.fitness_goals) if isinstance(user.fitness_goals, str) else user.fitness_goals
                if isinstance(goals, list) and goals:
                    profile_parts.append(f"Fitness-Ziele: {', '.join(goals)}")
                elif goals:
                    profile_parts.append(f"Fitness-Ziele: {goals}")
            except (json.JSONDecodeError, TypeError):
                if user.fitness_goals:
                    profile_parts.append(f"Fitness-Ziele: {user.fitness_goals}")
        if user.dietary_preferences:
            try:
                prefs = json.loads(user.dietary_preferences) if isinstance(user.dietary_preferences, str) else user.dietary_preferences
                if isinstance(prefs, list) and prefs:
                    profile_parts.append(f"Ernährungspräferenzen: {', '.join(prefs)}")
                elif prefs:
                    profile_parts.append(f"Ernährungspräferenzen: {prefs}")
            except (json.JSONDecodeError, TypeError):
                if user.dietary_preferences:
                    profile_parts.append(f"Ernährungspräferenzen: {user.dietary_preferences}")
        
        profile_str = "\n".join(profile_parts) if profile_parts else "Noch keine Profildaten vorhanden."
        
        # Additional context from frontend
        context_str = ""
        if context:
            context_parts = []
            if context.get('first_name'):
                first_name = context['first_name']
            if context.get('fitness_goals'):
                context_parts.append(f"Ziele: {context['fitness_goals']}")
            if context.get('dietary_preferences'):
                context_parts.append(f"Ernährung: {context['dietary_preferences']}")
            if context_parts:
                context_str = "\n" + "\n".join(context_parts)
        
        system_prompt = f"""Du bist der persönliche HyperFit Helfer von {first_name}. Du bist kein generischer Chatbot, sondern ein echter persönlicher Assistent, der {first_name} kennt und versteht.

WICHTIG - KRITISCH FÜR PERFORMANCE:
- Antworte DIREKT auf die Frage ohne unnötige Tool-Aufrufe
- Verwende Tools NUR wenn du spezifische Daten benötigst (z.B. aktuelle Workout-Daten, Check-In-Status)
- Für allgemeine Fragen über Ernährung, Training oder Tipps: Antworte direkt OHNE Tools zu verwenden
- Wenn du keine spezifischen Daten brauchst, antworte sofort mit deinem Wissen
- Vermeide mehrere Tool-Aufrufe hintereinander - nutze maximal 1-2 Tools pro Antwort

STIL:
- Sprich {first_name} immer direkt mit "du" an, als wärst du ein Freund oder Trainer
- Sei warmherzig, unterstützend und motivierend - wie ein echter Coach
- Verwende eine natürliche, gesprochene Sprache - keine formellen oder roboterhaften Formulierungen
- Zeige echtes Interesse an {first_name}s Fortschritt
- Gib praktische, umsetzbare Ratschläge
- Sei präzise, aber nicht zu technisch

CHECK-IN FUNKTIONALITÄT:
- Verwende Tools NUR wenn {first_name} explizit nach Check-In fragt oder du den aktuellen Status brauchst
- Für allgemeine Ernährungsfragen: Antworte direkt mit Tipps basierend auf {first_name}s Profil

{first_name}s Profil:
{profile_str}{context_str}

Antworte jetzt DIREKT auf {first_name}s Frage: {message}

WICHTIG: Antworte sofort ohne unnötige Tool-Aufrufe, es sei denn du brauchst wirklich spezifische Daten."""

        return system_prompt

    def _needs_tools(self, message: str) -> bool:
        """Determine if the message requires tool access (workout data, meal data, check-in)."""
        message_lower = message.lower()
        # Keywords that indicate need for specific data
        tool_keywords = [
            'mein workout', 'meine workouts', 'letztes workout', 'workout daten',
            'meine mahlzeit', 'letzte mahlzeit', 'meal analyse', 'mahlzeit analyse',
            'check-in status',  # Only status queries need tools, not analysis
            'meine kalorien', 'mein ziel', 'meine compliance', 'mein fortschritt'
        ]
        # Check-in analysis doesn't need tools - it's provided in the context
        if 'check-in durchführen' in message_lower or 'check-in machen' in message_lower or 'weekly check-in' in message_lower:
            return False
        return any(keyword in message_lower for keyword in tool_keywords)
    
    async def _direct_llm_response(self, user: User, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Get a direct response from LLM without using the agent (faster, no iteration limits)."""
        if ChatPromptTemplate is None:
            raise ImportError("ChatPromptTemplate not available")
        
        first_name = (user.full_name or user.username or "du").split(' ')[0]
        profile_parts = []
        if user.weight_kg:
            profile_parts.append(f"Gewicht: {user.weight_kg}kg")
        if user.height_cm:
            profile_parts.append(f"Größe: {user.height_cm}cm")
        if user.activity_level:
            profile_parts.append(f"Aktivitätslevel: {user.activity_level}")
        profile_str = "\n".join(profile_parts) if profile_parts else "Noch keine Profildaten vorhanden."
        
        # Build context string if provided (for check-ins)
        context_str = ""
        if context:
            if isinstance(context, dict):
                context_parts = []
                if 'check_in_data' in context:
                    check_in = context['check_in_data']
                    if 'adherence' in check_in:
                        context_parts.append(f"Compliance: {'Gut eingehalten' if check_in['adherence'] else 'Nicht so gut eingehalten'}")
                    if 'weight' in check_in:
                        context_parts.append(f"Gewicht: {check_in['weight']}kg")
                    if 'bodyFat' in check_in:
                        context_parts.append(f"Körperfett: {check_in['bodyFat']}%")
                    if 'goal' in check_in:
                        context_parts.append(f"Ziel: {check_in['goal']}")
                    if 'caloriesPrevious' in check_in:
                        context_parts.append(f"Aktuelles Kalorienziel: {check_in['caloriesPrevious']} kcal")
                if context_parts:
                    context_str = "\n\nCheck-In Daten:\n" + "\n".join(f"- {part}" for part in context_parts)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""Du bist der persönliche HyperFit Helfer von {first_name}. 
Antworte direkt und hilfreich auf Fragen über Training, Ernährung und Fitness.
{first_name}s Profil: {profile_str}
{context_str}
Antworte immer auf Deutsch, sei warmherzig und persönlich. Für Check-In Analysen gib konkrete, umsetzbare Empfehlungen mit Kalorienangaben (z.B. "Ich empfehle dir X kcal pro Tag")."""),
            ("human", "{question}")
        ])
        
        chain = prompt | self.llm
        response = await asyncio.to_thread(lambda: chain.invoke({"question": message}).content)
        return response

    async def chat(self, *, user: User, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run an agent conversation for the provided message with personalized context."""
        # Set user context in thread-local storage for thread safety
        self._set_active_user(user)

        try:
            # For simple questions, use direct LLM response (faster, no iteration limits)
            if not self._needs_tools(message):
                try:
                    response = await self._direct_llm_response(user, message, context)
                    return {"response": response}
                except Exception as e:
                    # Fallback to agent if direct LLM fails
                    print(f"Direct LLM failed, falling back to agent: {str(e)}")
            
            def _run_agent() -> str:
                """Run the agent in a thread-safe manner with personalized prompt."""
                try:
                    personalized_message = self._build_personalized_prompt(user, message, context)
                    result = self.agent.run(personalized_message)
                    # Ensure result is a string
                    if not isinstance(result, str):
                        return str(result)
                    return result
                except Exception as agent_error:
                    # Handle specific error types
                    error_str = str(agent_error)
                    
                    # Handle iteration/time limit errors
                    if "iteration limit" in error_str.lower() or "time limit" in error_str.lower() or "stopped due to" in error_str.lower():
                        first_name = (user.full_name or user.username or "du").split(' ')[0]
                        return f"Entschuldigung {first_name}, ich brauche etwas mehr Zeit für diese Anfrage. Könntest du die Frage etwas spezifischer formulieren oder in kleinere Fragen aufteilen?"
                    
                    # Handle parsing errors more gracefully
                    if "parsing error" in error_str.lower() or "could not parse" in error_str.lower():
                        # Try to extract the actual response from the error
                        # Sometimes the LLM response is in the error message
                        if "This is the error:" in error_str:
                            parts = error_str.split("This is the error:")
                            if len(parts) > 1:
                                actual_response = parts[1].strip().strip("`").strip()
                                if actual_response:
                                    return actual_response
                        # Fallback: return a user-friendly message
                        first_name = (user.full_name or user.username or "du").split(' ')[0]
                        return f"Entschuldigung {first_name}, ich hatte ein Problem beim Verarbeiten deiner Anfrage. Könntest du die Frage anders formulieren?"
                    
                    # Re-raise other errors with more context
                    import traceback
                    error_details = traceback.format_exc()
                    print(f"Agent execution error: {str(agent_error)}")
                    print(f"Traceback: {error_details}")
                    raise RuntimeError(f"Agent execution failed: {str(agent_error)}") from agent_error

            response = await asyncio.to_thread(_run_agent)
            return {"response": response}
        except Exception as e:
            # Log error with full traceback for debugging
            import traceback
            error_traceback = traceback.format_exc()
            print(f"Error in chat method: {str(e)}")
            print(f"Traceback: {error_traceback}")
            
            # Re-raise the exception so the router can handle it properly
            raise RuntimeError(f"Chat processing failed: {str(e)}") from e
        finally:
            # Always clear the user context to prevent leaks
            self._set_active_user(None)


assistant_service: Optional[AIAssistantService] = None


def get_ai_assistant_service() -> AIAssistantService:
    """Return singleton assistant service instance."""

    global assistant_service
    if assistant_service is None:
        assistant_service = AIAssistantService()
    return assistant_service









