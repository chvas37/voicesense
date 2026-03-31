from fastapi import Depends, FastAPI, HTTPException, status

from shared.database import close_db_pool, get_db_pool, init_db_pool
from shared.internal_auth import require_internal_token

app = FastAPI(title="room-service", version="0.1.0")


@app.on_event("startup")
async def on_startup() -> None:
    await init_db_pool()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db_pool()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/internal/rooms", dependencies=[Depends(require_internal_token)])
async def list_rooms() -> list[dict]:
    pool = get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, slug, title, is_persistent, created_at
            FROM rooms
            WHERE is_persistent = TRUE
            ORDER BY slug ASC
            """
        )

    return [
        {
            "id": str(row["id"]),
            "slug": row["slug"],
            "title": row["title"],
            "isPersistent": row["is_persistent"],
            "createdAt": row["created_at"].isoformat(),
        }
        for row in rows
    ]


@app.get("/internal/rooms/{room_id}", dependencies=[Depends(require_internal_token)])
async def get_room(room_id: str) -> dict:
    pool = get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, slug, title, is_persistent, created_at
            FROM rooms
            WHERE id = $1
            """,
            room_id,
        )

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    return {
        "id": str(row["id"]),
        "slug": row["slug"],
        "title": row["title"],
        "isPersistent": row["is_persistent"],
        "createdAt": row["created_at"].isoformat(),
    }
