import contextlib
import asyncio
import json
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from shared.config import get_settings
from shared.redis_client import close_redis, get_redis, init_redis
from shared.security import decode_access_token, TokenError

app = FastAPI(title="api-gateway", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    clientId: str | None = Field(default=None, max_length=128)


@app.on_event("startup")
async def on_startup() -> None:
    await init_redis()
    app.state.auth_client = httpx.AsyncClient(base_url=settings.auth_service_url, timeout=10.0)
    app.state.room_client = httpx.AsyncClient(base_url=settings.room_service_url, timeout=10.0)
    app.state.chat_client = httpx.AsyncClient(base_url=settings.chat_service_url, timeout=10.0)
    app.state.media_client = httpx.AsyncClient(base_url=settings.media_service_url, timeout=10.0)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await app.state.auth_client.aclose()
    await app.state.room_client.aclose()
    await app.state.chat_client.aclose()
    await app.state.media_client.aclose()
    await close_redis()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


def _internal_headers() -> dict[str, str]:
    return {"x-internal-token": settings.internal_service_token}


def _extract_user_from_token(token: str) -> dict[str, str]:
    try:
        decoded = decode_access_token(token)
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = decoded.get("sub")
    display_name = decoded.get("display_name")

    if not user_id or not display_name:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    return {
        "id": user_id,
        "displayName": display_name,
    }


def _raise_proxy_error(response: httpx.Response) -> None:
    detail = "Upstream service error"
    try:
        body = response.json()
        detail = body.get("detail", detail)
    except ValueError:
        pass
    raise HTTPException(status_code=response.status_code, detail=detail)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    return _extract_user_from_token(credentials.credentials)


@app.post("/api/v1/auth/guest")
async def guest_auth(payload: dict[str, Any], request: Request) -> dict:
    response = await request.app.state.auth_client.post("/internal/auth/guest", json=payload)
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


@app.post("/api/v1/auth/refresh")
async def refresh_auth(payload: dict[str, Any], request: Request) -> dict:
    response = await request.app.state.auth_client.post("/internal/auth/refresh", json=payload)
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


@app.get("/api/v1/rooms")
async def list_rooms(request: Request, _: dict[str, str] = Depends(get_current_user)) -> list[dict]:
    response = await request.app.state.room_client.get("/internal/rooms", headers=_internal_headers())
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


@app.get("/api/v1/rooms/{room_id}/messages")
async def list_messages(
    room_id: str,
    request: Request,
    before: str | None = None,
    limit: int = 50,
    _: dict[str, str] = Depends(get_current_user),
) -> dict:
    response = await request.app.state.chat_client.get(
        f"/internal/rooms/{room_id}/messages",
        params={"before": before, "limit": limit},
        headers=_internal_headers(),
    )
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


@app.post("/api/v1/rooms/{room_id}/messages")
async def create_message(
    room_id: str,
    payload: MessageCreateRequest,
    request: Request,
    user: dict[str, str] = Depends(get_current_user),
) -> dict:
    response = await request.app.state.chat_client.post(
        f"/internal/rooms/{room_id}/messages",
        headers=_internal_headers(),
        json={
            "author_id": user["id"],
            "body": payload.body,
            "client_id": payload.clientId,
        },
    )
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


@app.post("/api/v1/rooms/{room_id}/media-token")
async def create_media_token(
    room_id: str,
    request: Request,
    user: dict[str, str] = Depends(get_current_user),
) -> dict:
    response = await request.app.state.media_client.post(
        "/internal/media/token",
        headers=_internal_headers(),
        json={
            "room_id": room_id,
            "user_id": user["id"],
            "display_name": user["displayName"],
        },
    )
    if response.is_error:
        _raise_proxy_error(response)
    return response.json()


async def _forward_pubsub_messages(pubsub, websocket: WebSocket) -> None:
    async for raw in pubsub.listen():
        if raw is None:
            continue
        if raw.get("type") != "message":
            continue

        data = raw.get("data")
        if isinstance(data, bytes):
            data = data.decode("utf-8")
        await websocket.send_text(data)


@app.websocket("/ws/v1/rooms/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str) -> None:
    token = websocket.query_params.get("token")
    if token is None:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]

    if token is None:
        await websocket.close(code=4401, reason="Missing token")
        return

    try:
        user = _extract_user_from_token(token)
    except HTTPException:
        await websocket.close(code=4401, reason="Invalid token")
        return

    await websocket.accept()

    redis = get_redis()
    room_channel = f"ws:broadcast:{room_id}"
    presence_key = f"presence:{room_id}"
    user_id = user["id"]

    await redis.sadd(presence_key, user_id)
    await redis.publish(
        room_channel,
        json.dumps(
            {
                "type": "room.participant.joined",
                "payload": {"roomId": room_id, "userId": user_id},
            }
        ),
    )

    members = await redis.smembers(presence_key)
    await websocket.send_json(
        {
            "type": "room.presence.snapshot",
            "payload": {
                "roomId": room_id,
                "members": list(members),
            },
        }
    )

    pubsub = redis.pubsub()
    await pubsub.subscribe(room_channel)
    forward_task = asyncio.create_task(_forward_pubsub_messages(pubsub=pubsub, websocket=websocket))

    try:
        while True:
            text = await websocket.receive_text()
            try:
                incoming = json.loads(text)
            except json.JSONDecodeError:
                continue

            event_type = incoming.get("type")
            payload = incoming.get("payload", {})

            if event_type == "chat.message.send":
                body = str(payload.get("body", "")).strip()
                if not body:
                    continue

                await app.state.chat_client.post(
                    f"/internal/rooms/{room_id}/messages",
                    headers=_internal_headers(),
                    json={
                        "author_id": user_id,
                        "body": body,
                        "client_id": payload.get("clientId"),
                    },
                )

            if event_type == "room.presence.ping":
                await redis.sadd(presence_key, user_id)
    except WebSocketDisconnect:
        pass
    finally:
        forward_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await forward_task

        await pubsub.unsubscribe(room_channel)
        await pubsub.aclose()

        await redis.srem(presence_key, user_id)
        await redis.publish(
            room_channel,
            json.dumps(
                {
                    "type": "room.participant.left",
                    "payload": {"roomId": room_id, "userId": user_id},
                }
            ),
        )

