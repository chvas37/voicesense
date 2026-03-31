from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

import jwt

from shared.config import get_settings


class TokenError(Exception):
    pass


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, display_name: str) -> str:
    settings = get_settings()
    now = _now_utc()
    payload: dict[str, Any] = {
        "sub": user_id,
        "display_name": display_name,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_exp_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(session_id: str, user_id: str) -> str:
    settings = get_settings()
    now = _now_utc()
    payload: dict[str, Any] = {
        "sub": user_id,
        "sid": session_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.refresh_token_exp_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise TokenError("Invalid token") from exc
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise TokenError("Invalid access token")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise TokenError("Invalid refresh token")
    return payload
