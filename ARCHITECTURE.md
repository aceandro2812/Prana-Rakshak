# Traffic Sathi - Technical Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Agent Architecture](#agent-architecture)
3. [Data Flow](#data-flow)
4. [Session & Memory Management](#session--memory-management)
5. [Error Handling & Retry Logic](#error-handling--retry-logic)
6. [Security Considerations](#security-considerations)
7. [Scalability & Performance](#scalability--performance)
8. [Future Architecture Plans](#future-architecture-plans)

---

## System Overview

Traffic Sathi is a **multi-agent conversational AI system** built on Google's Agent Development Kit (ADK). The system employs a hierarchical agent architecture with specialized agents for different responsibilities, coordinated through sequential and parallel execution patterns.

### Core Design Principles

1. **Modularity**: Each agent has a single, well-defined responsibility
2. **Parallelism**: Independent tasks execute concurrently to reduce latency
3. **Persistence**: Sessions and memory are persisted across conversations
4. **Resilience**: Comprehensive retry logic and error handling
5. **Extensibility**: Easy to add new agents and capabilities

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Framework | Google ADK | Multi-agent orchestration |
| LLM | Gemini 2.5 Flash Lite | Language understanding & generation |
| Database | SQLite + aiosqlite | Session persistence |
| Memory | In-Memory Service | Short-term context storage |
| Geolocation | ipinfo.io API | Location detection |
| Runtime | Python 3.10+ | Application execution |

---

## Agent Architecture

### Agent Hierarchy

```
Full_Research_Agent (SequentialAgent)
│
├── 1. Location_Research_Agent (Agent)
│   └── Tools: get_precise_location()
│
├── 2. Local_Conditions_Research_Team (ParallelAgent)
│   ├── Aqi_Research_Agent (Agent)
│   │   └── Tools: google_search
│   └── Traffic_Research_Agent (Agent)
│       └── Tools: google_search
│
└── 3. MasterMind_Agent (Agent)
    ├── Tools: Search_Support_Agent (via AgentTool)
    │   └── Tools: google_search
    └── Tools: Memory_Support_Agent (via AgentTool)
        └── Tools: load_memory
```

### Agent Details

#### 1. Location_Research_Agent

**Type**: Basic Agent  
**Execution**: First in sequence  
**Model**: Gemini 2.5 Flash Lite  

**Responsibilities**:
- Invoke `get_precise_location()` function
- Parse IP-based geolocation data
- Format location information for downstream agents

**Input**: None (automatically triggered)  
**Output**: `location_research_output` (city, region, country, lat, lng)

**Implementation**:
```python
def get_precise_location() -> dict:
    """Returns location data from ipinfo.io API"""
    # IP geolocation logic
    return {"city": str, "region": str, "country": str, "lat": float, "lng": float}
```

**Design Rationale**:
- Single responsibility: location detection
- Fails gracefully with null values if API unavailable
- Uses optional IPINFO_TOKEN for enhanced accuracy

---

#### 2. Local_Conditions_Research_Team (Parallel Agent)

**Type**: ParallelAgent  
**Execution**: Second in sequence, after location is determined  
**Sub-agents**: Aqi_Research_Agent, Traffic_Research_Agent  

**Responsibilities**:
- Execute AQI and Traffic research concurrently
- Reduce overall latency by ~50%
- Aggregate results from both research agents

**Design Rationale**:
- AQI and Traffic research are independent → parallelizable
- Improves user experience with faster response times
- Both agents have access to location data from session state

---

##### 2a. Aqi_Research_Agent

**Type**: Basic Agent  
**Model**: Gemini 2.5 Flash Lite  
**Tools**: google_search (built-in)

**Responsibilities**:
- Search for current AQI data at user's location
- Research weather conditions (wind, temperature, humidity)
- Identify pollutant sources and contributing factors
- Generate 6-hour AQI forecast
- Provide health recommendations based on AQI levels

**Input**: Location data from session state  
**Output**: `aqi_research_output` (comprehensive AQI summary)

**Search Strategy**:
```
Queries:
1. "Current AQI in [city, region]"
2. "Air quality forecast [city]"
3. "Weather conditions [city]"
4. "Pollution sources [city]"
```

---

##### 2b. Traffic_Research_Agent

**Type**: Basic Agent  
**Model**: Gemini 2.5 Flash Lite  
**Tools**: google_search (built-in)

**Responsibilities**:
- Search for current traffic conditions
- Identify congestion hotspots
- Research ongoing events affecting traffic
- Analyze time-of-day patterns
- Generate 6-hour traffic forecast

**Input**: Location data from session state  
**Output**: `traffic_research_output` (comprehensive traffic summary)

**Search Strategy**:
```
Queries:
1. "Current traffic conditions [city]"
2. "Traffic forecast [city]"
3. "Road closures events [city]"
4. "Rush hour patterns [city]"
```

---

#### 3. MasterMind_Agent

**Type**: Basic Agent  
**Execution**: Third in sequence, after parallel research completes  
**Model**: Gemini 2.5 Flash Lite  
**Tools**: AgentTool(Search_Support_Agent), AgentTool(Memory_Support_Agent)

**Responsibilities**:
- Synthesize findings from AQI and Traffic agents
- Identify correlations between air quality and traffic
- Generate comprehensive, user-friendly summaries
- Answer follow-up questions
- Maintain conversation context
- Provide actionable recommendations

**Input**: 
- `aqi_research_output` (from Aqi_Research_Agent)
- `traffic_research_output` (from Traffic_Research_Agent)
- User messages

**Output**: `local_conditions_summary` (final response to user)

**Design Pattern - Agent-as-Tool Workaround**:

Due to ADK limitation (1 built-in tool per agent), MasterMind cannot directly use both `google_search` and `load_memory`. Solution:

```python
# Create separate agents for each built-in tool
Search_Support_Agent = Agent(tools=[google_search])
Memory_Support_Agent = Agent(tools=[load_memory])

# Wrap them as tools for MasterMind
MasterMind_Agent = Agent(
    tools=[
        AgentTool(Search_Support_Agent),
        AgentTool(Memory_Support_Agent)
    ]
)
```

**Callback**: `auto_save_session_to_memory_callback`
- Automatically saves session after each turn
- Enables memory persistence across conversations

---

## Data Flow

### Request Flow Diagram

```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│  Runner.run_async()                 │
│  - Creates new message content      │
│  - Loads session from database      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Full_Research_Agent.run_async()    │
│  (SequentialAgent)                  │
└─────────────────────────────────────┘
    │
    ├──► Step 1: Location_Research_Agent
    │              │
    │              ├─► get_precise_location()
    │              │      └─► ipinfo.io API
    │              │
    │              └─► Stores in session state:
    │                   location_research_output = {
    │                     "city": "...",
    │                     "region": "...",
    │                     "country": "...",
    │                     "lat": ...,
    │                     "lng": ...
    │                   }
    │
    ├──► Step 2: Local_Conditions_Research_Team
    │              (ParallelAgent)
    │              │
    │              ├─► Aqi_Research_Agent
    │              │     ├─► Reads location from session
    │              │     ├─► google_search (AQI data)
    │              │     └─► Stores: aqi_research_output
    │              │
    │              └─► Traffic_Research_Agent
    │                    ├─► Reads location from session
    │                    ├─► google_search (Traffic data)
    │                    └─► Stores: traffic_research_output
    │
    └──► Step 3: MasterMind_Agent
                   ├─► Reads: aqi_research_output
                   ├─► Reads: traffic_research_output
                   ├─► Synthesizes findings
                   ├─► Can delegate to:
                   │     ├─► Search_Support_Agent (google_search)
                   │     └─► Memory_Support_Agent (load_memory)
                   └─► Generates: local_conditions_summary
                         │
                         └─► auto_save_session_to_memory_callback
                               └─► Saves to memory service
    │
    ▼
Response streamed back to user
```

### State Management

#### Session State
Stored in SQLite database (`traffic_sathi_data.db`):

```python
{
    "session_id": "session_001",
    "user_id": "user",
    "app_name": "agents",
    "messages": [
        {
            "role": "user",
            "content": "Tell me about air quality"
        },
        {
            "role": "model",
            "author": "MasterMind_Agent",
            "content": "..."
        }
    ],
    "agent_outputs": {
        "location_research_output": {...},
        "aqi_research_output": "...",
        "traffic_research_output": "...",
        "local_conditions_summary": "..."
    }
}
```

#### Memory Service
In-memory storage for session-to-memory conversion:
- Extracts key information from sessions
- Makes it searchable via `load_memory` tool
- Enables agents to recall past conversations

---

## Session & Memory Management

### Database Architecture

**Database**: SQLite (via aiosqlite for async support)  
**Connection String**: `sqlite+aiosqlite:///./traffic_sathi_data.db`

**Schema** (managed automatically by ADK):
```sql
-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    app_name TEXT,
    user_id TEXT,
    session_id TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    state JSON
);

-- Messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    role TEXT,
    author TEXT,
    content JSON,
    timestamp TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Session Lifecycle

1. **Creation**: 
   ```python
   session = await session_service.create_session(
       app_name="agents",
       user_id="user",
       session_id="session_001"
   )
   ```

2. **Retrieval**:
   ```python
   session = await session_service.get_session(
       app_name="agents",
       user_id="user",
       session_id="session_001"
   )
   ```

3. **Update**: Automatic on each agent turn

4. **Memory Persistence**:
   ```python
   async def auto_save_session_to_memory_callback(callback_context):
       await callback_context._invocation_context.memory_service.add_session_to_memory(
           callback_context._invocation_context.session
       )
   ```

### Memory Retrieval

The `load_memory` tool enables agents to search past conversations:
```python
# Memory_Support_Agent uses load_memory
# MasterMind_Agent delegates to it via AgentTool

# Example query to memory:
"What did the user ask about yesterday?"
"Previous AQI readings for this location"
"User's typical commute times"
```

---

## Error Handling & Retry Logic

### Retry Configuration

```python
retry_config = types.HttpRetryOptions(
    attempts=5,                              # Max retries
    exp_base=7,                             # Exponential backoff (7^n seconds)
    initial_delay=1,                        # Initial delay before first retry
    http_status_codes=[429, 500, 503, 504] # Retry on these errors
)
```

**Retry Schedule**:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 7 seconds delay (7^1)
- Attempt 4: 49 seconds delay (7^2)
- Attempt 5: 343 seconds delay (7^3)

### Error Scenarios

#### 1. API Rate Limiting (429)
**Cause**: Too many requests to Gemini API  
**Handling**: Exponential backoff retry  
**User Impact**: Slight delay, transparent to user

#### 2. API Timeout (500, 503, 504)
**Cause**: Gemini API temporarily unavailable  
**Handling**: Retry with backoff  
**User Impact**: May see longer response times

#### 3. Geolocation Failure
**Cause**: ipinfo.io API unavailable or invalid IP  
**Handling**: Return null values, agent continues  
**User Impact**: May need to manually specify location (future feature)

#### 4. Memory Service Failure
**Cause**: Issue saving session to memory  
**Handling**: Log warning, continue execution  
**User Impact**: Past conversations may not be recalled

```python
async def auto_save_session_to_memory_callback(callback_context):
    try:
        await callback_context._invocation_context.memory_service.add_session_to_memory(
            callback_context._invocation_context.session
        )
    except Exception as e:
        print(f"Warning: Failed to save session to memory: {e}")
        # Continue execution - non-critical error
```

---

## Security Considerations

### API Key Management

**Environment Variables** (`.env` file):
```env
GOOGLE_GENAI_API_KEY=your_key_here
IPINFO_TOKEN=your_token_here
```

**Security Best Practices**:
- ✅ API keys stored in `.env` (excluded from git via `.gitignore`)
- ✅ Keys loaded via `python-dotenv`
- ✅ No hardcoded credentials in source code
- ⚠️ **TODO**: Implement secret rotation
- ⚠️ **TODO**: Use cloud secret management (AWS Secrets Manager, GCP Secret Manager)

### Data Privacy

**Current State**:
- Location data derived from IP address (approximate)
- All data stored locally in SQLite database
- No external data sharing

**Future Considerations**:
- Implement user consent for data collection
- GDPR compliance for EU users
- Data retention policies
- User data deletion capabilities
- Encryption at rest for sensitive data

### Input Validation

**Current Implementation**:
- Basic input stripping and validation
- SQL injection protected by SQLAlchemy ORM
- No direct string interpolation in queries

**Future Enhancements**:
- Input sanitization for XSS prevention
- Rate limiting per user
- Request size limits
- Content filtering for inappropriate queries

---

## Scalability & Performance

### Current Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Avg Response Time | 8-12 seconds | Includes parallel research |
| Location Detection | 0.5-1 second | Depends on ipinfo.io API |
| AQI Research | 4-6 seconds | Google Search + LLM processing |
| Traffic Research | 4-6 seconds | Google Search + LLM processing |
| Synthesis | 2-4 seconds | MasterMind processing |
| Database Operations | <100ms | SQLite local access |

### Optimization Strategies

#### 1. Parallel Execution
**Implementation**: `ParallelAgent` for AQI and Traffic research  
**Benefit**: ~50% reduction in research time  
**Trade-off**: Increased API usage (2 concurrent requests)

#### 2. Model Selection
**Choice**: Gemini 2.5 Flash Lite  
**Rationale**:
- Cost-effective for high-volume usage
- Sufficient quality for summarization tasks
- Lower latency than larger models

**Future**: Conditional model selection
- Simple queries → Flash Lite
- Complex analysis → Gemini Pro

#### 3. Caching (Future Enhancement)

**Proposed Strategy**:
```python
# Cache layer for location data
location_cache = {
    "ip_address": {
        "data": {...},
        "expires_at": timestamp
    }
}

# Cache layer for AQI/Traffic data
conditions_cache = {
    "location_key": {
        "aqi_data": {...},
        "traffic_data": {...},
        "timestamp": ...,
        "expires_in": 300  # 5 minutes
    }
}
```

**Benefits**:
- Reduce API calls for repeat queries
- Lower latency for cached data
- Cost savings

---

## Future Architecture Plans

### Phase 2: Frontend & Backend Separation

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│  - Web UI                                                    │
│  - Mobile-responsive                                         │
│  - Real-time updates                                         │
│  - Interactive maps                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API / WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Server (FastAPI/Flask)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authentication & Authorization                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Rate Limiting & Request Validation                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Traffic Sathi Agent System (Current)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
   ┌────────┐   ┌─────────┐   ┌────────┐   ┌──────────┐
   │  Redis │   │PostgreSQL│   │  S3    │   │ External │
   │ Cache  │   │ Database │   │ Storage│   │   APIs   │
   └────────┘   └─────────┘   └────────┘   └──────────┘
```

### Phase 3: Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong/Nginx)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │Location  │  │   AQI    │  │ Traffic  │  │  User    │
  │ Service  │  │ Service  │  │ Service  │  │ Service  │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                ┌─────┴──────┐
                ▼            ▼
           ┌────────┐   ┌────────┐
           │Message │   │ Event  │
           │ Queue  │   │  Bus   │
           │(Kafka) │   │        │
           └────────┘   └────────┘
```

### Phase 4: ML Enhancement

**Predictive Models**:
```python
class AQIPredictionModel:
    """ML model for AQI forecasting"""
    
    def train(self, historical_data):
        # Train on historical AQI patterns
        # Features: weather, traffic, time, events
        pass
    
    def predict(self, current_conditions, hours_ahead):
        # Predict AQI for next N hours
        # More accurate than LLM-based forecasts
        return predicted_aqi_values
```

**Traffic Pattern Recognition**:
```python
class TrafficPatternAnalyzer:
    """Analyze recurring traffic patterns"""
    
    def identify_rush_hours(self, location):
        # ML-based rush hour detection
        pass
    
    def predict_congestion(self, location, time, events):
        # Predict traffic congestion
        pass
```

### Phase 5: Real-time Data Integration

**Sensor Integration**:
- Connect to local air quality sensor networks
- Real-time traffic cameras
- IoT devices for hyperlocal data

**Data Pipeline**:
```
Sensors → Data Ingestion → Processing → Storage → Agent Access
           (Kafka)        (Spark)    (TimeSeries DB)
```

---

## Development Roadmap

### Q1 2026: Foundation
- [ ] Web frontend (React + Tailwind)
- [ ] REST API backend (FastAPI)
- [ ] User authentication
- [ ] Multi-location support

### Q2 2026: Features
- [ ] Historical data visualization
- [ ] Alert notifications
- [ ] Mobile apps (React Native)
- [ ] Calendar integration

### Q3 2026: Intelligence
- [ ] ML-based AQI predictions
- [ ] Traffic pattern analysis
- [ ] Route optimization
- [ ] Personalized recommendations

### Q4 2026: Scale
- [ ] Microservices architecture
- [ ] Real-time sensor integration
- [ ] Multi-region deployment
- [ ] Enterprise features

---

## Testing Strategy

### Unit Tests
```python
# tests/test_agents.py
def test_location_detection():
    """Test IP-based geolocation"""
    location = get_precise_location()
    assert location["city"] is not None
    assert location["lat"] is not None

# tests/test_session_persistence.py
async def test_session_save_load():
    """Test session persistence"""
    session = await create_session()
    loaded = await load_session(session.id)
    assert loaded.id == session.id
```

### Integration Tests
```python
# tests/integration/test_full_flow.py
async def test_complete_research_flow():
    """Test end-to-end agent execution"""
    response = await runner.run_async(
        user_id="test_user",
        session_id="test_session",
        new_message="Tell me about air quality"
    )
    assert "AQI" in response
    assert "traffic" in response
```

### Performance Tests
```python
# tests/performance/test_latency.py
async def test_response_time():
    """Ensure response time < 15 seconds"""
    start = time.time()
    await runner.run_async(...)
    duration = time.time() - start
    assert duration < 15
```

---

## Monitoring & Observability (Future)

### Metrics to Track
- Request latency (p50, p95, p99)
- API call success/failure rates
- Database query performance
- Memory usage
- Agent execution times

### Logging Strategy
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "agent_execution",
    agent_name="MasterMind_Agent",
    duration_ms=1234,
    tokens_used=567,
    user_id="user_123"
)
```

### Alerting
- Response time > 30 seconds
- Error rate > 5%
- Database connection failures
- API quota approaching limits

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2025  
**Maintained By**: Traffic Sathi Development Team
