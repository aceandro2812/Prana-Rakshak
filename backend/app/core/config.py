from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GOOGLE_API_KEY: str
    IPINFO_TOKEN: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
