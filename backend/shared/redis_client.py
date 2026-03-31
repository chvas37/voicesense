from typing import Optional
from redis.asyncio import Redis

from shared.config import get_settings

_redis: Optional[Redis] = None


async def init_redis() -> None:
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis is not initialized")
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
