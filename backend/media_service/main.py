import json
import time

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel

from shared.config import get_settings
from shared.database import close_db_pool, get_db_pool, init_db_pool
from shared.internal_auth import require_internal_token
from shared.redis_client import close_redis, get_redis, init_redis

app = FastAPI(title="media-service", version="0.1.0")


class MediaTokenRequest(BaseModel):
    room_id: str
    user_id: str
    display_name: str


class LivekitWebhookEvent(BaseModel):
    event: str
    room: str
    participant_identity: str | None = None


def _create_livekit_token(room_slug: str, user_id: str, display_name: str) -> str:
    settings = get_settings()
    now_ts = int(time.time())
    payload = {
        "iss": settings.livekit_api_key,
        "sub": user_id,
        "name": display_name,
        "nbf": now_ts,
        "exp": now_ts + 60 * 60,
        "video": {
            "roomJoin": True,
            "room": room_slug,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    return jwt.encode(payload, settings.livekit_api_secret, algorithm="HS256")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db_pool()
    await init_redis()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_redis()
    await close_db_pool()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/media/token", dependencies=[Depends(require_internal_token)])
async def create_media_token(payload: MediaTokenRequest) -> dict:
    pool = get_db_pool()
    async with pool.acquire() as conn:
        room = await conn.fetchrow(
            """
            SELECT id, slug
            FROM rooms
            WHERE id = $1
            """,
            payload.room_id,
        )

    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    token = _create_livekit_token(room_slug=room["slug"], user_id=payload.user_id, display_name=payload.display_name)
    settings = get_settings()
    return {
        "token": token,
        "livekit_url": settings.livekit_ws_url,
    }


@app.post("/internal/livekit/webhook")
async def livekit_webhook(payload: LivekitWebhookEvent) -> dict[str, bool]:
    pool = get_db_pool()
    redis = get_redis()

    async with pool.acquire() as conn:
        room = await conn.fetchrow("SELECT id FROM rooms WHERE slug = $1", payload.room)

    if room is None:
        return {"ok": True}

    room_id = str(room["id"])
    presence_key = f"presence:{room_id}"
    channel = f"ws:broadcast:{room_id}"
    participant_id = payload.participant_identity or "unknown"

    if payload.event == "participant_joined":
        await redis.sadd(presence_key, participant_id)
        await redis.publish(
            channel,
            json.dumps(
                {
                    "type": "room.participant.joined",
                    "payload": {"userId": participant_id, "roomId": room_id},
                }
            ),
        )

    if payload.event == "participant_left":
        await redis.srem(presence_key, participant_id)
        await redis.publish(
            channel,
            json.dumps(
                {
                    "type": "room.participant.left",
                    "payload": {"userId": participant_id, "roomId": room_id},
                }
            ),
        )

    return {"ok": True}
