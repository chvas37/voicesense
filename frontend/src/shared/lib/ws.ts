import { API_BASE_URL } from "@/shared/config/env";

export function getWsBaseUrl(): string {
  if (API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL.replace("https://", "wss://");
  }
  return API_BASE_URL.replace("http://", "ws://");
}
