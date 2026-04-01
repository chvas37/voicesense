import { API_BASE_URL } from "@/shared/config/env";

export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function httpJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...restOptions } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
    });
  } catch (cause) {
    const hint =
      API_BASE_URL === ""
        ? " Is the Next dev server running with docker compose (API on port 8080)?"
        : " Check NEXT_PUBLIC_API_BASE_URL and that the API is reachable.";
    throw new Error(
      `Network error (${cause instanceof Error ? cause.message : "unknown"}).${hint}`,
      { cause },
    );
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    let detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: string }).detail)
        : `Request failed with status ${response.status}`;
    if (response.status === 404 && API_BASE_URL === "") {
      detail +=
        " (No backend for /api. On Vercel set API_GATEWAY_URL to your API origin, or set NEXT_PUBLIC_API_BASE_URL.)";
    }
    throw new HttpError(response.status, detail);
  }

  return body as T;
}
