"""
Enhanced HyperAI Agent Service
LangGraph + OpenAI + Tavily with conversation memory and structured output
"""

import os
import json
import base64
from typing import Optional, Dict, List
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from langchain_tavily import TavilySearch
    from langchain_openai import ChatOpenAI
    from langgraph.graph import StateGraph
    from langgraph.prebuilt import ToolNode, tools_condition
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain.memory import ConversationBufferMemory
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False
    print("⚠️  LangChain/Tavily not available. Install with: pip install langchain langchain-tavily langchain-openai langgraph")

from backend.core.config import settings

# Initialize Tavily if available
tavily = None
if TAVILY_AVAILABLE and os.getenv("TAVILY_API_KEY"):
    try:
        tavily = TavilySearch(api_key=os.getenv("TAVILY_API_KEY"), max_results=5)
    except Exception as e:
        print(f"⚠️  Tavily initialization failed: {e}")

# Initialize OpenAI model
model = None
if settings.openai_api_key:
    try:
        model = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model or "gpt-4o-mini",
            temperature=0.3
        )
    except Exception as e:
        print(f"⚠️  OpenAI model initialization failed: {e}")

# Structured output model for workout/nutrition plans
structured_model = None
if settings.openai_api_key:
    try:
        structured_model = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model or "gpt-4o-mini",
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}}
        )
    except Exception as e:
        print(f"⚠️  Structured model initialization failed: {e}")

# Build agent graph if tools are available
agent = None
if TAVILY_AVAILABLE and tavily and model:
    try:
        class AgentState(dict):
            messages: list

        tools = [tavily]
        tool_node = ToolNode(tools=tools)

        graph = StateGraph(AgentState)
        graph.add_node("chat_model", model)
        graph.add_node("tools", tool_node)
        graph.add_conditional_edges("chat_model", tools_condition)
        graph.add_edge("tools", "chat_model")
        graph.set_entry_point("chat_model")
        graph.set_finish_point("chat_model")
        agent = graph.compile()
    except Exception as e:
        print(f"⚠️  Agent graph initialization failed: {e}")

# Memory storage per user session
memory_stores: Dict[str, ConversationBufferMemory] = {}

def get_memory(session_id: str) -> Optional[ConversationBufferMemory]:
    """Get or create memory for a session"""
    if not TAVILY_AVAILABLE:
        return None
    
    if session_id not in memory_stores:
        memory_stores[session_id] = ConversationBufferMemory(
            return_messages=True,
            memory_key="history"
        )
    return memory_stores[session_id]

def get_user_context(user) -> str:
    """Build user context string from User model"""
    if not user:
        return ""
    
    context_parts = []
    if user.email:
        context_parts.append(f"User: {user.email}")
    if user.height:
        context_parts.append(f"Height: {user.height} cm")
    if user.weight:
        context_parts.append(f"Weight: {user.weight} kg")
    if user.age:
        context_parts.append(f"Age: {user.age} years")
    if user.gender:
        context_parts.append(f"Gender: {user.gender}")
    if user.fitness_goals:
        try:
            goals = json.loads(user.fitness_goals) if isinstance(user.fitness_goals, str) else user.fitness_goals
            if isinstance(goals, list):
                context_parts.append(f"Fitness goals: {', '.join(goals)}")
            elif isinstance(goals, str):
                context_parts.append(f"Fitness goals: {goals}")
        except:
            if isinstance(user.fitness_goals, str):
                context_parts.append(f"Fitness goals: {user.fitness_goals}")
    if user.activity_level:
        context_parts.append(f"Activity level: {user.activity_level}")
    if user.dietary_preferences:
        context_parts.append(f"Dietary preferences: {user.dietary_preferences}")
    if user.allergies:
        context_parts.append(f"Allergies: {user.allergies}")
    
    if context_parts:
        return "\n".join(context_parts)
    return ""

def ask_agent(
    prompt: str,
    user=None,
    session_id: Optional[str] = None,
    use_structured_output: bool = False
) -> str:
    """
    Ask the agent with conversation memory and user personalization
    
    Args:
        prompt: User's question
        user: User model instance (optional)
        session_id: Unique session identifier for memory (defaults to user.id if available)
        use_structured_output: Whether to use JSON structured output
    """
    if not model:
        return "❌ AI service not available. Please configure OpenAI API key."
    
    # Use user ID as session ID if not provided
    if not session_id and user:
        session_id = f"user_{user.id}"
    elif not session_id:
        session_id = "default"
    
    # Get memory if available
    memory = get_memory(session_id) if TAVILY_AVAILABLE else None
    
    # Load conversation history
    history = []
    if memory:
        try:
            history = memory.load_memory_variables({}).get("history", [])
        except:
            history = []
    
    # Build system message with user context
    system_context = get_user_context(user)
    if system_context:
        system_msg = SystemMessage(
            content=f"You are HyperAI, an expert fitness and nutrition AI assistant for the HyperFit platform. "
                   f"Here's the user's profile:\n{system_context}\n\n"
                   f"Provide personalized, actionable fitness and nutrition advice. "
                   f"Be concise, evidence-based, and encouraging."
        )
        messages = [system_msg] + history + [HumanMessage(content=prompt)]
    else:
        system_msg = SystemMessage(
            content="You are HyperAI, an expert fitness and nutrition AI assistant for the HyperFit platform. "
                   "Provide personalized, actionable fitness and nutrition advice. "
                   "Be concise, evidence-based, and encouraging."
        )
        messages = [system_msg] + history + [HumanMessage(content=prompt)]
    
    # Use structured output model if requested
    current_model = structured_model if (use_structured_output and structured_model) else model
    
    try:
        # Invoke agent or model
        if use_structured_output and structured_model:
            # For structured output, use model directly
            result = current_model.invoke(messages)
            response_content = result.content
        elif agent and TAVILY_AVAILABLE:
            # Use agent graph for tool calling
            result = agent.invoke({"messages": messages})
            response_content = result["messages"][-1].content
        else:
            # Fallback to direct model call
            result = current_model.invoke(messages)
            response_content = result.content
        
        # Save to memory if available
        if memory:
            try:
                memory.save_context(
                    {"input": prompt},
                    {"output": response_content}
                )
            except:
                pass
        
        return response_content
    except Exception as e:
        return f"❌ Error processing request: {str(e)}"

def generate_workout_plan(
    days: int = 7,
    user=None,
    session_id: Optional[str] = None
) -> Dict:
    """Generate a structured workout plan"""
    if not structured_model:
        return {"error": "Structured output model not available"}
    
    prompt = f"""Generate a {days}-day progressive workout plan in JSON format.
    Include:
    - "days": array of day objects
    - Each day should have: "day_number", "focus", "exercises" (array with name, sets, reps, rest)
    - "progression": how to advance each week
    - "notes": general tips
    
    Format as valid JSON only."""
    
    response = ask_agent(prompt, user, session_id, use_structured_output=True)
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"error": "Failed to parse structured response", "raw": response}

def analyze_nutrition(
    food_description: str,
    user=None,
    session_id: Optional[str] = None
) -> Dict:
    """Analyze nutrition and return macros"""
    if not structured_model:
        return {"error": "Structured output model not available"}
    
    prompt = f"""Analyze this food/meal and return JSON with:
    - "food": the food name
    - "calories": estimated calories
    - "protein": grams of protein
    - "carbs": grams of carbohydrates
    - "fat": grams of fat
    - "fiber": grams of fiber (if applicable)
    - "notes": any additional nutritional insights
    
    Food: {food_description}
    Format as valid JSON only."""
    
    response = ask_agent(prompt, user, session_id, use_structured_output=True)
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"error": "Failed to parse structured response", "raw": response}

def analyze_meal_image(
    image_data: bytes,
    user=None,
    session_id: Optional[str] = None
) -> Dict:
    """Analyze meal from image using OpenAI Vision"""
    try:
        from openai import OpenAI
        
        if not settings.openai_api_key:
            return {"error": "OpenAI API key not configured"}
        
        client = OpenAI(api_key=settings.openai_api_key)
        
        # Convert image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Build prompt with user context
        system_context = get_user_context(user)
        prompt_text = """Analyze this food/meal image and return a JSON object with:
        - "food": the food/meal name and description
        - "calories": estimated calories
        - "protein": grams of protein
        - "carbs": grams of carbohydrates
        - "fat": grams of fat
        - "fiber": grams of fiber (if applicable)
        - "serving_size": estimated serving size
        - "notes": any additional nutritional insights or recommendations
        
        Return ONLY valid JSON, no other text."""
        
        if system_context:
            prompt_text += f"\n\nUser context:\n{system_context}"
        
        # Call OpenAI Vision API
        response = client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
    except ImportError:
        return {"error": "OpenAI package not installed. Install with: pip install openai"}
    except json.JSONDecodeError as e:
        return {"error": "Failed to parse JSON response", "raw": str(e)}
    except Exception as e:
        return {"error": str(e)}

# Cached version for repeated prompts
@lru_cache(maxsize=100)
def cached_ask_agent(prompt: str) -> str:
    """Cached version for exact prompt matches (no memory)"""
    if not model:
        return "❌ AI service not available."
    
    try:
        messages = [HumanMessage(content=prompt)]
        if agent and TAVILY_AVAILABLE:
            result = agent.invoke({"messages": messages})
            return result["messages"][-1].content
        else:
            result = model.invoke(messages)
            return result.content
    except Exception as e:
        return f"❌ Error: {str(e)}"

