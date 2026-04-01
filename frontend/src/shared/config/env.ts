/**
 * Empty default → browser calls `/api/...` on the Next host; `next.config` rewrites to the gateway.
 * Set `NEXT_PUBLIC_API_BASE_URL` when the API is on another origin (e.g. production).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
