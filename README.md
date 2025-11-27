The core vision of Traffic Sathi is to **simplify decision-making for daily commuters and health-conscious individuals** by consolidating critical environmental and traffic data into a single, easy-to-use conversational interface.

### The Problem We Solve

Currently, people need to:
- Visit multiple websites to check air quality (AQI) data
- Check separate apps for traffic conditions
- Manually correlate weather forecasts with AQI and traffic
- Spend time analyzing when is the best time to travel or go outdoors
- Miss important connections between air quality and traffic congestion

### Our Solution

Traffic Sathi uses a **specialized multi-agent AI system** that:

✅ **Automatically detects your location** using IP geolocation  
✅ **Researches air quality** with real-time AQI data, weather conditions, and forecasts  
✅ **Analyzes traffic patterns** including congestion, events, and time-of-day factors  
✅ **Identifies time windows** when air quality is optimal or hazardous  
✅ **Correlates data** to show how traffic affects air quality and vice versa  
✅ **Provides actionable insights** in natural language conversations  
✅ **Remembers your preferences** across sessions for personalized recommendations  

### Use Cases

1. **Daily Commuters**: Plan your commute during times with better air quality and less traffic
2. **Parents**: Choose optimal outdoor play times for children based on AQI
3. **Fitness Enthusiasts**: Schedule outdoor workouts when air quality is good
4. **Health-Conscious Individuals**: Avoid exposure during poor air quality windows
5. **Event Planners**: Factor in traffic and air quality for outdoor events
6. **Delivery Services**: Optimize routes considering both traffic and environmental conditions

---

## Features ✨

- **Multi-Agent System**: Specialized agents for location detection, AQI research, traffic analysis, and consolidation
- **Multi-Turn Conversations**: Ask follow-up questions and the agent remembers your conversation context
- **Database Persistence**: Sessions are stored in SQLite for conversation continuity across restarts
- **Long-Term Memory**: Uses ADK's MemoryService to recall information from past conversations
- **IP-Based Geolocation**: Automatically detects your location using ipinfo.io API
- **Parallel Processing**: AQI and Traffic research agents run concurrently for faster results
- **State-Based Communication**: Agents share information via session state using ADK's fan-out/gather pattern

## Architecture 🏗️

The system uses a hierarchical multi-agent structure:

1. **Full_Research_Agent** (SequentialAgent)
   - **Location_Research_agent**: Detects user location via IP geolocation
   - **Local_Conditions_Research_Team** (ParallelAgent)
     - **Aqi_Research_agent**: Researches air quality conditions
     - **Traffic_Research_agent**: Researches traffic conditions
   - **MasterMind_Agent**: Consolidates findings and handles user interaction

## Installation 📦

1. Clone the repository:
```bash
git clone <repository-url>
cd Traffic_Sathi
```

2. Install dependencies:
```bash
pip install google-adk requests python-dotenv
```

3. (Optional) Create a `.env` file for enhanced features:
```env
IPINFO_TOKEN=your_ipinfo_token_here
```

## Usage 🚀

Run the application:
```bash
python main.py
```

### Example Conversation

```
Welcome to Traffic Sathi! 🚦
Ask me about air quality and traffic conditions in your area.
You can ask follow-up questions, and I'll remember our conversation.
Type 'exit' or 'quit' to end the session.

------------------------------------------------------------

🔵 You: What are the current air quality and traffic conditions?

🤖 MasterMind Agent: [Detailed report with AQI and traffic analysis]

------------------------------------------------------------

🔵 You: What was the AQI you mentioned?

🤖 MasterMind Agent: [Recalls specific AQI value from previous response]

------------------------------------------------------------

🔵 You: exit

👋 Thank you for using Traffic Sathi! Session saved.
```

## Key Features Explained 🔍

### Multi-Turn Conversations
- Sessions are persisted in `traffic_sathi_data.db` (SQLite)
- Conversation history is maintained across app restarts
- Use the same `session_id` to resume previous conversations

### Memory System
- **Short-term memory**: Session history (events and state)
- **Long-term memory**: Extracted knowledge from past conversations
- The MasterMind agent uses the `load_memory` tool to recall past information
- Sessions are automatically saved to memory after each turn

### State-Based Communication
The system uses ADK's recommended pattern for multi-agent communication:
- Location agent outputs via `output_key="location_research_output"`
- Sub-agents read via placeholder `{location_research_output}` in their instructions
- This avoids the multi-tool limitation in sub-agents

## Technical Details 🔧

### Database Schema
The DatabaseSessionService creates tables automatically:
- Sessions: Stores session metadata (id, user_id, app_name, timestamps)
- Events: Stores conversation events (messages, tool calls, responses)
- State: Stores session state key-value pairs

### Memory Service
- Uses `InMemoryMemoryService` for development
- Stores conversation content for semantic search
- Can be upgraded to `VertexAiMemoryBankService` for production

### Tool Limitations
Due to ADK constraints:
- Sub-agents can only have ONE tool each
- Cannot mix FunctionTool with built-in tools in sub-agents
- Solution: Use state-passing pattern via SequentialAgent hierarchy

## Configuration ⚙️

### Gemini Model
Currently using `gemini-2.5-flash-lite` for all agents. To use a more powerful model with better tool support:

```python
model=Gemini(model="gemini-2.0-flash", retry_options=retry_config)
```

### Retry Configuration
The system includes exponential backoff for API errors:
- 5 retry attempts
- Retries on HTTP 429, 500, 503, 504 errors
- Base delay multiplier: 7 seconds

## Project Structure 📁

```
Traffic_Sathi/
├── main.py                      # Main application with all agents
├── traffic_sathi_data.db        # SQLite database (auto-created)
├── pyproject.toml               # Project configuration
├── README.md                    # This file
└── .env                         # Environment variables (optional)
```

## Troubleshooting 🔧

### "Tool use with function calling is unsupported"
- This occurs when sub-agents have multiple tools or mix function/built-in tools
- Current architecture avoids this by using state-passing pattern

### Location detection fails
- Check internet connectivity
- Add IPINFO_TOKEN to .env for higher API quota
- The system gracefully handles null location values

### Session not resuming
- Ensure the database file `traffic_sathi_data.db` exists
- Check that `session_id` matches previous session
- Database is created automatically on first run

## Future Enhancements 🚀

- [ ] Implement Traffic MCP tool (mentioned in Traffic agent instruction)
- [ ] Add fallback location APIs (ipapi.co, geolocation-db.com)
- [ ] Upgrade to VertexAiMemoryBankService for production deployment
- [ ] Add session management commands (list, delete, switch sessions)
- [ ] Implement streaming responses for real-time feedback

## Dependencies 📚

- `google-adk`: Agent Development Kit framework
- `requests`: HTTP library for API calls
- `python-dotenv`: Environment variable management
- `asyncio`: Asynchronous execution
- `sqlite3`: Database (included in Python standard library)

## License 📄

[Add your license here]

## Contributing 🤝

[Add contribution guidelines here]

## Credits 👏

Built with Google's Agent Development Kit (ADK)
- [ADK Documentation](https://google.github.io/adk-docs/)
- [ADK Python SDK](https://github.com/google/adk-python)
