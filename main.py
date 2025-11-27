"""
Traffic Sathi - Intelligent Multi-Agent Air Quality & Traffic Analysis System

This module implements a sophisticated multi-agent AI system that provides comprehensive
insights about air quality (AQI) and traffic conditions in the user's location.

Architecture:
    - Sequential Agent Orchestration: Location → Research → Synthesis
    - Parallel Research: AQI and Traffic agents run concurrently
    - Agent-as-Tool Pattern: Bypass ADK's one-built-in-tool-per-agent limitation
    - Session Persistence: SQLite database for conversation history
    - Memory Service: Enable agents to recall past conversations

Author: Your Name
Version: 1.0
Date: November 28, 2025
License: MIT
"""

from google.adk.agents import Agent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import InMemoryRunner
from google.adk.sessions import InMemorySessionService, DatabaseSessionService
from google.adk.memory import InMemoryMemoryService
from google.adk.tools import google_search, ToolContext, load_memory
from google.adk.tools.agent_tool import AgentTool
from google.genai import types
import asyncio
import dotenv
import os
import requests
import aiosqlite

# Load environment variables from .env file (GOOGLE_GENAI_API_KEY, IPINFO_TOKEN)
dotenv.load_dotenv()
# Retry Config
retry_config=types.HttpRetryOptions(
    attempts=5,  # Maximum retry attempts
    exp_base=7,  # Delay multiplier
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504], # Retry on these HTTP errors
)

# ------------------------
# Callback Functions
# ------------------------

async def auto_save_session_to_memory_callback(callback_context):
    """
    Automatically save session content to memory after each agent turn.
    This allows the agent to build long-term knowledge from conversations.
    """
    try:
        await callback_context._invocation_context.memory_service.add_session_to_memory(
            callback_context._invocation_context.session
        )
    except Exception as e:
        print(f"Warning: Failed to save session to memory: {e}")

# ------------------------
# Custom Tools
# ------------------------

def get_precise_location() -> dict:
    """
    Resolve approximate location for the current machine using public IP.

    Uses ipinfo's public endpoint (no token) to fetch: city, region,
    country, latitude, longitude. Falls back to myip.openbsd.org if needed.

    Returns:
    dict: {"city": str, "region": str, "country": str, "lat": float, "lng": float}
    """
    try:
        token = os.getenv("IPINFO_TOKEN")
        headers = {"Authorization": f"Bearer {token}"} if token else None
        r = requests.get("https://ipinfo.io/json", timeout=5, headers=headers)
        r.raise_for_status()
        data = r.json()
        loc = data.get("loc", "")
        lat, lng = (None, None)
        if loc and "," in loc:
            parts = loc.split(",")
            if len(parts) == 2:
                try:
                    lat = float(parts[0])
                    lng = float(parts[1])
                except ValueError:
                    lat, lng = (None, None)
        return {
            "city": data.get("city"),
            "region": data.get("region"),
            "country": data.get("country"),
            "lat": lat,
            "lng": lng,
        }
    except Exception:
        return {
            "city": None,
            "region": None,
            "country": None,
            "lat": None,
            "lng": None,
        }



# ------------------------
# Agents
# ------------------------
Location_Research_agent=Agent(
    name="Location_Research_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""Your sole task is to call the tool get_precise_location and output the result.
    Do not ask the user any questions. If the tool returns null values, still output a best-effort string including any available fields.
    Output format (single line): city=<city>; region=<region>; country=<country>; lat=<lat>; lng=<lng>
    """,
    tools=[get_precise_location],
    output_key="location_research_output"
)

Aqi_Research_agent=Agent(
    name="Aqi_Research_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""Research Deeply on the Air Quality in the current location of the user. 
    Research All the weather conditions like air movement wind speed , temperature and external factors that can affect the Air Quality of the Users location . 
    Your task will be to make an AQI Summary at the current location of the user , with all the factors that are affecting it . 
    You will Output a proper Current AQI Summary as well as weather forecasts for the next 6 hours , which can be used by your boss to forecast AQI properly !.
    To research properly use the google search tool to get the latest information on weather conditions and air quality in the user's location.
    The user's location information is available in the session. Search for current AQI and weather data for that location.
 """,
 tools=[google_search],
 output_key="aqi_research_output"
    )

Traffic_Research_agent=Agent(
    name="Traffic_Research_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""Research Deeply on the Traffic Conditions in the current location of the user. 
    Research All the factors like weather conditions, time of day, and any ongoing events that can affect the Traffic Conditions of the Users location .
    Your task will be to make a Traffic Summary at the current location of the user , with all the factors that are affecting it . 
    You will Output a proper Current Traffic Summary as well as traffic forecasts for the next 6 hours , which can be used by your boss to forecast Traffic properly !.
    To research properly use the google search tool to get the latest information on weather conditions and traffic related news articles in the user's location.
    The user's location information is available in the session. Search for current traffic and weather data for that location.
 """,
 tools=[google_search],
 output_key="traffic_research_output"
    )
# Create separate agents for built-in tools (ADK limitation: only 1 built-in tool per agent)
Search_Support_Agent=Agent(
    name="Search_Support_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a search specialist. Use google_search to find current information as requested.
    Provide detailed search results that will help answer the user's questions.
    """,
    tools=[google_search]
)

Memory_Support_Agent=Agent(
    name="Memory_Support_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a memory specialist. Use load_memory to recall information from past conversations.
    Help retrieve relevant context from previous interactions.
    """,
    tools=[load_memory]
)

MasterMind_Agent=Agent(
    name="MasterMind_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are the MasterMind Agent whose role is to consolidate and summarize the findings from the Aqi_Research_Agent and Traffic_Research_Agent.
    Your task is to create a comprehensive summary of the local conditions, combining insights on air quality and traffic.
    You need to analyze the outputs from both agents and synthesize the information into a coherent report.
    
    The AQI research findings are: {aqi_research_output?}
    The Traffic research findings are: {traffic_research_output?}
    
    Based on this information, provide a detailed summary that includes:
    1. Current Air Quality Index (AQI) and factors affecting it.
    2. Current Traffic Conditions and factors affecting it.
    3. Forecasts for both AQI and Traffic for the next 6 hours.
    4. Any correlations or interactions between air quality and traffic conditions.

    For follow-up questions, you can:
    - Use the Search_Support_Agent to find additional current information
    - Use the Memory_Support_Agent to recall information from past conversations

    Ensure that the summary is clear, concise, and informative, providing a holistic view of the local conditions.
 """,
 tools=[AgentTool(Search_Support_Agent), AgentTool(Memory_Support_Agent)],
 output_key="local_conditions_summary",
 after_agent_callback=auto_save_session_to_memory_callback
)

Local_Conditions_Research_Team=ParallelAgent(
    name = "LocalConditionsResearchTeam",
    sub_agents=[Aqi_Research_agent, Traffic_Research_agent],
)

Full_Research_Agent=SequentialAgent(
    name="Full_Research_Agent",
    sub_agents=[Location_Research_agent, Local_Conditions_Research_Team, MasterMind_Agent],
)





async def main() -> None:
    """
    Entrypoint: Multi-turn conversation with database session and memory persistence.
    Users can ask follow-up questions, and the agent maintains context across turns.
    """
    # Initialize services with database for persistence
    # Note: aiosqlite is required for async SQLite support
    db_url = "sqlite+aiosqlite:///./traffic_sathi_data.db"
    session_service = DatabaseSessionService(db_url=db_url)
    memory_service = InMemoryMemoryService()

    # Create runner using Runner class (not InMemoryRunner) to support custom services
    from google.adk.runners import Runner
    runner = Runner(
        agent=Full_Research_Agent,
        app_name="agents",
        session_service=session_service,
        memory_service=memory_service
    )

    # Create a persistent session for this user
    user_id: str = "user"
    session_id: str = "session_001"
    
    # Check if session already exists, otherwise create new one
    try:
        session = await runner.session_service.get_session(
            app_name="agents", user_id=user_id, session_id=session_id
        )
        if session is not None:
            print("\n📂 Resuming existing session...\n")
        else:
            session = await runner.session_service.create_session(
                app_name="agents", user_id=user_id, session_id=session_id
            )
            print("\n✨ Starting new session...\n")
    except Exception:
        session = await runner.session_service.create_session(
            app_name="agents", user_id=user_id, session_id=session_id
        )
        print("\n✨ Starting new session...\n")

    print("Welcome to Traffic Sathi! 🚦")
    print("Ask me about air quality and traffic conditions in your area.")
    print("You can ask follow-up questions, and I'll remember our conversation.")
    print("Type 'exit' or 'quit' to end the session.\n")
    print("-" * 60)

    # Multi-turn conversation loop
    while True:
        # Get user input
        user_input = input("\n🔵 You: ").strip()
        
        if not user_input:
            continue
            
        # Check for exit command
        if user_input.lower() in ["exit", "quit", "bye"]:
            print("\n👋 Thank you for using Traffic Sathi! Session saved.")
            break
        
        # Prepare the user's message in ADK format
        content = types.Content(role="user", parts=[types.Part(text=user_input)])
        
        print("\n🤖 MasterMind Agent: ", end="", flush=True)
        
        # Stream events and print only MasterMind's final response
        response_printed = False
        async for event in runner.run_async(
            user_id=user_id, session_id=session.id, new_message=content
        ):
            if getattr(event, "is_final_response", None) and event.is_final_response():
                if getattr(event, "author", None) == "MasterMind_Agent":
                    if event.content and event.content.parts:
                        print(event.content.parts[0].text)
                        response_printed = True
                    break
        
        if not response_printed:
            print("(No response generated)")
        
        print("\n" + "-" * 60)


if __name__ == "__main__":
    asyncio.run(main())