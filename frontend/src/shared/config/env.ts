/**
 * Empty default → browser calls `/api/...` on the Next host; `next.config` rewrites to the gateway.
 * Set `NEXT_PUBLIC_API_BASE_URL` when the API is on another origin (no rewrite), or for WebSockets
 * when you use server-only `API_GATEWAY_URL` for HTTP.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** `wss://` / `ws://` / `https://` — WebSocket base when `API_BASE_URL` is empty (e.g. Vercel + `API_GATEWAY_URL` only). */
export const PUBLIC_WS_URL = process.env.NEXT_PUBLIC_WS_URL?.trim() ?? "";
