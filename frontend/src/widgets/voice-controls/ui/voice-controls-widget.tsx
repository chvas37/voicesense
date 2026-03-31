"use client";

interface VoiceControlsWidgetProps {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
}

export function VoiceControlsWidget({
  isConnecting,
  isConnected,
  error,
  onConnect,
  onDisconnect,
}: VoiceControlsWidgetProps) {
  return (
    <section className="panel">
      <h3>Voice controls</h3>
      <div className="inlineActions">
        <button onClick={onConnect} disabled={isConnecting || isConnected}>
          {isConnecting ? "Connecting..." : "Connect mic"}
        </button>
        <button onClick={onDisconnect} disabled={!isConnected}>
          Disconnect mic
        </button>
      </div>
      <p>{isConnected ? "Voice connected" : "Voice disconnected"}</p>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
