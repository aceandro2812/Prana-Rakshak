from google.adk.agents import Agent, SequentialAgent, ParallelAgent
from google.adk.models.google_llm import Gemini
from google.adk.tools import google_search, load_memory
from google.adk.tools.agent_tool import AgentTool
from google.genai import types
import requests
import os
from app.core.config import settings

# Retry Config
retry_config = types.HttpRetryOptions(
    attempts=5,
    exp_base=7,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)

# ------------------------
# Callback Functions
# ------------------------
async def auto_save_session_to_memory_callback(callback_context):
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
    try:
        token = settings.IPINFO_TOKEN
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
Location_Research_agent = Agent(
    name="Location_Research_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""Your sole task is to call the tool get_precise_location and output the result.
    Do not ask the user any questions. If the tool returns null values, still output a best-effort string including any available fields.
    Output format (single line): city=<city>; region=<region>; country=<country>; lat=<lat>; lng=<lng>
    """,
    tools=[get_precise_location],
    output_key="location_research_output"
)

Aqi_Research_agent = Agent(
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

Traffic_Research_agent = Agent(
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

Search_Support_Agent = Agent(
    name="Search_Support_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a search specialist. Use google_search to find current information as requested.
    Provide detailed search results that will help answer the user's questions.
    """,
    tools=[google_search]
)

Memory_Support_Agent = Agent(
    name="Memory_Support_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are a memory specialist. Use load_memory to recall information from past conversations.
    Help retrieve relevant context from previous interactions.
    """,
    tools=[load_memory]
)

MasterMind_Agent = Agent(
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

Local_Conditions_Research_Team = ParallelAgent(
    name="LocalConditionsResearchTeam",
    sub_agents=[Aqi_Research_agent, Traffic_Research_agent],
)

Full_Research_Agent = SequentialAgent(
    name="Full_Research_Agent",
    sub_agents=[Location_Research_agent, Local_Conditions_Research_Team, MasterMind_Agent],
)
