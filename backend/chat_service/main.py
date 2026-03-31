from datetime import datetime
import json
import uuid

from fastapi import Depends, FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

from shared.database import close_db_pool, get_db_pool, init_db_pool
from shared.internal_auth import require_internal_token
from shared.redis_client import close_redis, get_redis, init_redis

app = FastAPI(title="chat-service", version="0.1.0")


class MessageCreateRequest(BaseModel):
    author_id: str
    body: str = Field(min_length=1, max_length=4000)
    client_id: str | None = Field(default=None, max_length=128)


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


def _serialize_message(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "roomId": str(row["room_id"]),
        "authorId": str(row["author_id"]),
        "authorName": row["author_name"],
        "body": row["body"],
        "clientId": row["client_id"],
        "createdAt": row["created_at"].isoformat(),
    }


@app.get("/internal/rooms/{room_id}/messages", dependencies=[Depends(require_internal_token)])
async def get_messages(
    room_id: str,
    before: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> dict:
    pool = get_db_pool()
    before_dt: datetime | None = None
    if before:
        try:
            before_dt = datetime.fromisoformat(before)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid before cursor") from exc

    async with pool.acquire() as conn:
        if before_dt:
            rows = await conn.fetch(
                """
                SELECT m.id, m.room_id, m.author_id, u.display_name AS author_name,
                       m.body, m.client_id, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.author_id
                WHERE m.room_id = $1 AND m.created_at < $2
                ORDER BY m.created_at DESC
                LIMIT $3
                """,
                room_id,
                before_dt,
                limit,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT m.id, m.room_id, m.author_id, u.display_name AS author_name,
                       m.body, m.client_id, m.created_at
                FROM messages m
                JOIN users u ON u.id = m.author_id
                WHERE m.room_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2
                """,
                room_id,
                limit,
            )

    messages = [_serialize_message(dict(row)) for row in rows][::-1]
    next_cursor = messages[0]["createdAt"] if messages else None

    return {
        "items": messages,
        "nextCursor": next_cursor,
    }


@app.post("/internal/rooms/{room_id}/messages", dependencies=[Depends(require_internal_token)])
async def create_message(room_id: str, payload: MessageCreateRequest) -> dict:
    pool = get_db_pool()
    message_id = str(uuid.uuid4())

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO messages (id, room_id, author_id, body, client_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (room_id, author_id, client_id) DO NOTHING
            RETURNING id, room_id, author_id, body, client_id, created_at
            """,
            message_id,
            room_id,
            payload.author_id,
            payload.body.strip(),
            payload.client_id,
        )

        if row is None and payload.client_id is not None:
            row = await conn.fetchrow(
                """
                SELECT id, room_id, author_id, body, client_id, created_at
                FROM messages
                WHERE room_id = $1 AND author_id = $2 AND client_id = $3
                ORDER BY created_at DESC
                LIMIT 1
                """,
                room_id,
                payload.author_id,
                payload.client_id,
            )

        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create message")

        user = await conn.fetchrow(
            "SELECT display_name FROM users WHERE id = $1",
            payload.author_id,
        )

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    message = {
        "id": str(row["id"]),
        "roomId": str(row["room_id"]),
        "authorId": str(row["author_id"]),
        "authorName": user["display_name"],
        "body": row["body"],
        "clientId": row["client_id"],
        "createdAt": row["created_at"].isoformat(),
    }

    redis = get_redis()
    channel = f"ws:broadcast:{room_id}"
    await redis.publish(
        channel,
        json.dumps(
            {
                "type": "chat.message.created",
                "payload": message,
            }
        ),
    )

    return message
