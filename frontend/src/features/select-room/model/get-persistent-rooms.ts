import { Room } from "@/entities/room/model/types";
import { httpJson } from "@/shared/api/http";

export async function getPersistentRooms(token: string): Promise<Room[]> {
  return httpJson<Room[]>("/api/v1/rooms", { token });
}
