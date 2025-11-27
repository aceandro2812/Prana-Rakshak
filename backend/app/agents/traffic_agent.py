from google.adk.agents import Agent, SequentialAgent, ParallelAgent
from google.adk.models.google_llm import Gemini
from google.adk.tools import google_search, load_memory, ToolContext
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
def get_precise_location(context: ToolContext) -> dict:
    """
    Resolve the user's location.
    Prioritizes precise coordinates from the frontend (stored in session state).
    Falls back to IP-based geolocation if precise coordinates are missing.
    """
    # 1. Try to get precise location from session state
    try:
        session_state = context.session.state
        if session_state and "precise_location" in session_state:
            loc = session_state["precise_location"]
            return {
                "city": "Current Location", # We could reverse geocode this if needed, or let the agent do it
                "region": "",
                "country": "",
                "lat": loc.get("lat"),
                "lng": loc.get("lng"),
                "source": "GPS"
            }
    except Exception as e:
        print(f"Error reading session state: {e}")

    # 2. Fallback to IP Geolocation
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
            "source": "IP"
        }
    except Exception:
        return {
            "city": None,
            "region": None,
            "country": None,
            "lat": None,
            "lng": None,
            "source": "None"
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
    instruction="""You are an expert Air Quality Researcher and Environmental Analyst.
    Your goal is to provide a comprehensive, real-time, and actionable AQI report for the user's current location.
    
    You must conduct a deep and thorough research covering the following specific areas:
    1. **Real-time Data**: Find the current AQI value, PM2.5, PM10 levels, and key pollutants.
    2. **Weather Impact**: Analyze current weather conditions (wind speed/direction, temperature, humidity, fog/smog) and how they are influencing air quality right now.
    3. **Latest News (CRITICAL)**: Search for the *latest* news articles (published in the last 24-48 hours) regarding air pollution in this specific area. Look for reports on specific sources like stubble burning, industrial fires, or vehicular pollution spikes.
    4. **Government Actions & Circulars (CRITICAL)**: Specifically search for recent government orders, circulars, or court directives.
       - For India (especially Delhi/NCR), look for **GRAP (Graded Response Action Plan)** stages (Stage I, II, III, or IV), **CAQM (Commission for Air Quality Management)** orders, or Supreme Court directives.
       - Look for restrictions on construction, vehicle bans (e.g., BS-III petrol/BS-IV diesel), or school closures.
    5. **Health Advisories**: Find official health warnings or recommendations for citizens (e.g., "avoid outdoor exercise").
    6. **Forecast**: Provide a data-backed 6-hour AQI forecast based on weather patterns.

    **Search Strategy**:
    - Use specific queries like: "latest air pollution news [location]", "GRAP stage prevailing in [location] today", "CAQM latest order air quality", "school holiday pollution [location]", "current AQI and weather [location]".
    - Do not rely on generic knowledge; find *current* facts.

    Output a structured summary covering all these points.
    """,
    tools=[google_search],
    output_key="aqi_research_output"
)

Traffic_Research_agent = Agent(
    name="Traffic_Research_Agent",
    model=Gemini(model="gemini-2.5-flash-lite", retry_options=retry_config),
    instruction="""You are an expert Traffic Analyst and Urban Mobility Specialist.
    Your goal is to provide a detailed and real-time traffic situation report for the user's current location.

    You must conduct a deep research covering:
    1. **Current Congestion**: Identify major traffic jams, choke points, or slow-moving zones in the city/area right now.
    2. **Incidents & Events**: Search for recent accidents, road closures, construction work, or VIP movements affecting traffic.
    3. **Government Advisories**: Look for official traffic police advisories, diversions, or special arrangements (e.g., for festivals, protests, or marathons).
    4. **Impact of Pollution/Weather**: Check if low visibility (smog/fog) or waterlogging is affecting traffic flow.
    5. **Forecast**: Predict traffic conditions for the next 6 hours (e.g., upcoming rush hour impact).

    **Search Strategy**:
    - Use queries like: "latest traffic jam news [location]", "traffic advisory [location] police today", "road closure [location] today", "protest traffic diversion [location]".

    Output a structured summary covering these points.
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
