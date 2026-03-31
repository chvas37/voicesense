"use client";

interface ParticipantsListProps {
  participants: string[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <section className="panel">
      <h3>Participants ({participants.length})</h3>
      <ul className="stackList">
        {participants.map((participantId) => (
          <li key={participantId}>{participantId}</li>
        ))}
      </ul>
    </section>
  );
}
