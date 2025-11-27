from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.adk.memory import InMemoryMemoryService
from google.genai import types
import asyncio
import os

# Import our agents (to be refactored)
# For now, we'll assume they will be in app.agents.traffic_agent
# We need to make sure we can import them. 
# I will create the agent file next.

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"
    user_id: str = "user"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

# Global services (in a real app, use dependency injection or a singleton pattern)
# We need to initialize these on startup or lazily
session_service = None
memory_service = None
runner = None

async def get_runner():
    global session_service, memory_service, runner
    if runner is None:
        from app.agents.traffic_agent import Full_Research_Agent
        
        # Use synchronous driver to avoid MissingGreenlet error in DatabaseSessionService init
        db_url = "sqlite:///./traffic_sathi_data.db"
        session_service = DatabaseSessionService(db_url=db_url)
        memory_service = InMemoryMemoryService()
        
        runner = Runner(
            agent=Full_Research_Agent,
            app_name="agents",
            session_service=session_service,
            memory_service=memory_service
        )
    return runner

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    current_runner = await get_runner()
    
    # Create/Get session
    session = await current_runner.session_service.get_session(
        app_name="agents", user_id=request.user_id, session_id=request.session_id
    )
    if not session:
        session = await current_runner.session_service.create_session(
            app_name="agents", user_id=request.user_id, session_id=request.session_id
        )
    
    # Update session state with precise location if provided
    if request.latitude is not None and request.longitude is not None:
        if session.state is None:
            session.state = {}
        session.state["precise_location"] = {
            "lat": request.latitude,
            "lng": request.longitude
        }
        # We need to save the session state update. 
        # The runner usually handles saving after execution, but we want this available immediately.
        # However, since we are about to run the agent, we can rely on the agent reading from session.state
        # But we must ensure the session object passed to run_async has this state.
        # The runner re-loads session? No, it takes session_id. 
        # Actually runner.run_async takes session_id and loads it. 
        # So we should update the session via the service or ensure the runner uses our modified session.
        # ADK Runner loads session by ID. So we must save it first.
        await current_runner.session_service.update_session(session)

    content = types.Content(role="user", parts=[types.Part(text=request.message)])
    
    final_text = ""
    
    # Run the agent
    # Note: This waits for the full response. For streaming, we'd need a WebSocket or SSE.
    async for event in current_runner.run_async(
        user_id=request.user_id, session_id=session.id, new_message=content
    ):
        if getattr(event, "is_final_response", None) and event.is_final_response():
            if getattr(event, "author", None) == "MasterMind_Agent":
                 if event.content and event.content.parts:
                    final_text = event.content.parts[0].text
    
    if not final_text:
        final_text = "(No response generated)"
        
    return ChatResponse(response=final_text, session_id=request.session_id)

@router.get("/history/{session_id}")
async def get_history(session_id: str, user_id: str = "user"):
    current_runner = await get_runner()
    session = await current_runner.session_service.get_session(
        app_name="agents", user_id=user_id, session_id=session_id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Convert ADK messages to a simpler format if needed
    # For now, just return the raw session state or messages if accessible
    # The ADK session object might differ, let's try to get messages from the DB directly or via service
    # The session object itself has .messages usually
    return {"messages": [m.model_dump() for m in session.messages] if hasattr(session, "messages") else []}
