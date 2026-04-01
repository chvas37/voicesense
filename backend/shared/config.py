from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    cors_origins: list[str]
    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_algorithm: str
    access_token_exp_minutes: int
    refresh_token_exp_days: int
    internal_service_token: str
    auth_service_url: str
    room_service_url: str
    chat_service_url: str
    media_service_url: str
    livekit_ws_url: str
    livekit_api_key: str
    livekit_api_secret: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    cors_raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    cors_origins = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]

    return Settings(
        app_name=os.getenv("APP_NAME", "voicesense"),
        environment=os.getenv("ENVIRONMENT", "development"),
        cors_origins=cors_origins,
        database_url=os.getenv("DATABASE_URL", "postgresql://voicesense:voicesense@postgres:5432/voicesense"),
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        jwt_secret=os.getenv("JWT_SECRET", "change-me"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_exp_minutes=int(os.getenv("ACCESS_TOKEN_EXP_MINUTES", "60")),
        refresh_token_exp_days=int(os.getenv("REFRESH_TOKEN_EXP_DAYS", "14")),
        internal_service_token=os.getenv("INTERNAL_SERVICE_TOKEN", "internal-token"),
        auth_service_url=os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000"),
        room_service_url=os.getenv("ROOM_SERVICE_URL", "http://room-service:8000"),
        chat_service_url=os.getenv("CHAT_SERVICE_URL", "http://chat-service:8000"),
        media_service_url=os.getenv("MEDIA_SERVICE_URL", "http://media-service:8000"),
        livekit_ws_url=os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880"),
        livekit_api_key=os.getenv("LIVEKIT_API_KEY", "devkey"),
        livekit_api_secret=os.getenv("LIVEKIT_API_SECRET", "secret"),
    )
