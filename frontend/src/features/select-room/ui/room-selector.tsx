"use client";

import { Room } from "@/entities/room/model/types";

interface RoomSelectorProps {
  rooms: Room[];
  onSelect: (room: Room) => void;
}

export function RoomSelector({ rooms, onSelect }: RoomSelectorProps) {
  return (
    <section className="panel">
      <h2>Select room</h2>
      <p>All rooms are persistent and always available.</p>
      <div className="stack">
        {rooms.map((room) => (
          <button key={room.id} onClick={() => onSelect(room)}>
            {room.title} ({room.slug})
          </button>
        ))}
      </div>
    </section>
  );
}
