"""Load application settings from backend/.env and environment variables."""
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings(BaseSettings):
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    database_url: str = "sqlite:///./deviations.db"

    frontend_origin: str = "http://localhost:5173"


settings = Settings()
