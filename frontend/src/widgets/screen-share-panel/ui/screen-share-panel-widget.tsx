"use client";

interface ScreenSharePanelWidgetProps {
  isSharing: boolean;
  screenAudioOn: boolean;
  error: string | null;
  onStart: () => Promise<void>;
  onStop: () => void;
}

export function ScreenSharePanelWidget({
  isSharing,
  screenAudioOn,
  error,
  onStart,
  onStop,
}: ScreenSharePanelWidgetProps) {
  return (
    <section className="panel">
      <h3>Screen sharing (preview)</h3>
      <div className="inlineActions">
        <button onClick={onStart} disabled={isSharing}>
          Start screen share
        </button>
        <button onClick={onStop} disabled={!isSharing}>
          Stop screen share
        </button>
      </div>
      <p>
        {isSharing
          ? `Sharing is active${screenAudioOn ? " with system audio" : " without system audio"}.`
          : "Not sharing."}
      </p>
      <p className="muted">
        Sprint 1 keeps screen capture local in UI. Publishing tracks to the room is planned for Sprint 2.
      </p>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
