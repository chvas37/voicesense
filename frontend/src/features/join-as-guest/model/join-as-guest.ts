import { AppUser } from "@/entities/user/model/types";
import { httpJson } from "@/shared/api/http";

export interface GuestAuthResponse {
  access_token: string;
  refresh_token: string;
  user: AppUser;
}

export async function joinAsGuest(displayName: string): Promise<GuestAuthResponse> {
  return httpJson<GuestAuthResponse>("/api/v1/auth/guest", {
    method: "POST",
    body: JSON.stringify({ display_name: displayName }),
  });
}
