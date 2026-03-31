"use client";

import { FormEvent, useState } from "react";

interface MessageInputProps {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [body, setBody] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = body.trim();
    if (!normalized) {
      return;
    }

    await onSend(normalized);
    setBody("");
  };

  return (
    <form className="messageForm" onSubmit={handleSubmit}>
      <input
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a message"
        maxLength={4000}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !body.trim()}>
        Send
      </button>
    </form>
  );
}
