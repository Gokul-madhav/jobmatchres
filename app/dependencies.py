"""
Shared FastAPI dependencies (injected via Depends).
"""
from functools import lru_cache

import redis

from app.config import Settings, settings


@lru_cache
def get_settings() -> Settings:
    return settings


def get_redis() -> redis.Redis:
    """FastAPI dependency that returns the shared Redis client."""
    from app.cache import get_redis_client
    return get_redis_client()
