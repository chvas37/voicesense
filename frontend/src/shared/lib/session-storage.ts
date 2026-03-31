import { AppUser } from "@/entities/user/model/types";

export interface SessionSnapshot {
  accessToken: string;
  refreshToken: string;
  user: AppUser;
}

const STORAGE_KEY = "voicesense.session";

export function saveSession(session: SessionSnapshot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): SessionSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
