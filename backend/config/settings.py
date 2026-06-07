from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    port: int = 8000
    app_env: str = "development"
    cors_origins: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "exp://localhost:19000",
    ]

    # Agora ConvoAI — required for voice session endpoints
    agora_app_id: str = ""
    agora_app_certificate: str = ""
    agora_customer_id: str = ""
    agora_customer_secret: str = ""
    # Public URL this backend is reachable at — Agora will POST tool calls here.
    # Use ngrok for local dev: ngrok http 8000 → copy https URL
    webhook_base_url: str = ""
    # RTC channel name — must match what the R1 device is configured to join
    agora_channel: str = "pointdrop"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
