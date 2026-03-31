from typing import Optional
import asyncpg

from shared.config import get_settings

_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=10)


def get_db_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool


async def close_db_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
