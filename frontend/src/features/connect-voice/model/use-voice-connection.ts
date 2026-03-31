"use client";

import { useState } from "react";

import { httpJson } from "@/shared/api/http";

interface VoiceTokenResponse {
  token: string;
  livekit_url: string;
}

interface UseVoiceConnectionResult {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: (roomId: string, accessToken: string) => Promise<void>;
  disconnect: () => void;
}

export function useVoiceConnection(): UseVoiceConnectionResult {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const connect = async (roomId: string, accessToken: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      await httpJson<VoiceTokenResponse>(`/api/v1/rooms/${roomId}/media-token`, {
        method: "POST",
        token: accessToken,
      });

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(micStream);
      setIsConnected(true);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Failed to connect voice");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setStream(null);
    setIsConnected(false);
  };

  return {
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
