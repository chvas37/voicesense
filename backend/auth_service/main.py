from datetime import datetime, timedelta, timezone
import uuid

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from shared.config import get_settings
from shared.database import close_db_pool, get_db_pool, init_db_pool
from shared.security import create_access_token, create_refresh_token, decode_refresh_token, TokenError

app = FastAPI(title="auth-service", version="0.1.0")


class GuestAuthRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=64)


class RefreshRequest(BaseModel):
    refresh_token: str


@app.on_event("startup")
async def on_startup() -> None:
    await init_db_pool()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db_pool()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/auth/guest")
async def guest_auth(payload: GuestAuthRequest) -> dict:
    pool = get_db_pool()
    user_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO users (id, display_name)
            VALUES ($1, $2)
            """,
            user_id,
            payload.display_name.strip(),
        )

    refresh_token = create_refresh_token(session_id=session_id, user_id=user_id)
    access_token = create_access_token(user_id=user_id, display_name=payload.display_name.strip())
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_exp_days)

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO sessions (id, user_id, refresh_token, expires_at)
            VALUES ($1, $2, $3, $4)
            """,
            session_id,
            user_id,
            refresh_token,
            expires_at,
        )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "displayName": payload.display_name.strip(),
            "role": "guest",
        },
    }


@app.post("/internal/auth/refresh")
async def refresh_auth(payload: RefreshRequest) -> dict:
    try:
        decoded = decode_refresh_token(payload.refresh_token)
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = decoded.get("sub")
    session_id = decoded.get("sid")
    if not user_id or not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    pool = get_db_pool()
    async with pool.acquire() as conn:
        session = await conn.fetchrow(
            """
            SELECT s.id, s.expires_at, u.display_name
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1 AND s.user_id = $2 AND s.refresh_token = $3
            """,
            session_id,
            user_id,
            payload.refresh_token,
        )

    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")

    if session["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    access_token = create_access_token(user_id=user_id, display_name=session["display_name"])
    return {"access_token": access_token}
