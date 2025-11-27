from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import dotenv

dotenv.load_dotenv()

app = FastAPI(
    title="Traffic Sathi API",
    description="Backend API for Traffic Sathi Agent System",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to Traffic Sathi API 🚦"}
