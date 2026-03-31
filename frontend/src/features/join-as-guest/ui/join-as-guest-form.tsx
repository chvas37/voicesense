"use client";

import { FormEvent, useState } from "react";

interface JoinAsGuestFormProps {
  onSubmit: (displayName: string) => Promise<void>;
}

export function JoinAsGuestForm({ onSubmit }: JoinAsGuestFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = displayName.trim();
    if (!normalized) {
      setError("Please enter your name.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(normalized);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to join";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <h2>Join VoiceSense</h2>
      <p>Enter a display name to join the persistent voice rooms.</p>
      <form onSubmit={handleSubmit} className="stack">
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Display name"
          maxLength={64}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Joining..." : "Join as guest"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
