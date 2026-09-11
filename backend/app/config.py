from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Sovereign AI Workbench"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    OLLAMA_HOST: str = "http://localhost:11434"
    QDRANT_HOST: str = "http://localhost:6333"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

settings = Settings()
