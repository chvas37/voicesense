export type AppUserRole = "guest";

export interface AppUser {
  id: string;
  displayName: string;
  role: AppUserRole;
}
