"use client";

import { Room } from "@/entities/room/model/types";

interface RoomHeaderProps {
  room: Room;
  userName: string;
  onLeaveRoom: () => void;
  onSignOut: () => void;
}

export function RoomHeader({ room, userName, onLeaveRoom, onSignOut }: RoomHeaderProps) {
  return (
    <header className="panel headerRow">
      <div>
        <h2>{room.title}</h2>
        <p>
          Logged in as <strong>{userName}</strong>
        </p>
      </div>
      <div className="inlineActions">
        <button onClick={onLeaveRoom}>Change room</button>
        <button className="danger" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
