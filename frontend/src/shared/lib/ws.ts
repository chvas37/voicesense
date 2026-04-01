import { API_BASE_URL } from "@/shared/config/env";

export function getWsBaseUrl(): string {
  if (API_BASE_URL) {
    if (API_BASE_URL.startsWith("https://")) {
      return API_BASE_URL.replace("https://", "wss://");
    }
    return API_BASE_URL.replace("http://", "ws://");
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const wsProto = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${hostname}:8080`;
  }
  return "ws://127.0.0.1:8080";
}
