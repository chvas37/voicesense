import { API_BASE_URL, PUBLIC_WS_URL } from "@/shared/config/env";

export function getWsBaseUrl(): string {
  if (API_BASE_URL) {
    if (API_BASE_URL.startsWith("https://")) {
      return API_BASE_URL.replace("https://", "wss://");
    }
    return API_BASE_URL.replace("http://", "ws://");
  }
  if (PUBLIC_WS_URL) {
    if (PUBLIC_WS_URL.startsWith("wss://") || PUBLIC_WS_URL.startsWith("ws://")) {
      return PUBLIC_WS_URL.replace(/\/$/, "");
    }
    if (PUBLIC_WS_URL.startsWith("https://")) {
      return PUBLIC_WS_URL.replace("https://", "wss://").replace(/\/$/, "");
    }
    if (PUBLIC_WS_URL.startsWith("http://")) {
      return PUBLIC_WS_URL.replace("http://", "ws://").replace(/\/$/, "");
    }
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${hostname}:8080`;
  }
  return "ws://127.0.0.1:8080";
}
