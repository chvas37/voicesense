from fastapi import Header, HTTPException, status

from shared.config import get_settings


async def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
