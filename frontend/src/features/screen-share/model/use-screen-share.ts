"use client";

import { useMemo, useState } from "react";

interface UseScreenShareResult {
  isSharing: boolean;
  screenAudioOn: boolean;
  error: string | null;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

export function useScreenShare(): UseScreenShareResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSharing = useMemo(() => Boolean(stream), [stream]);
  const screenAudioOn = useMemo(() => {
    if (!stream) {
      return false;
    }
    return stream.getAudioTracks().length > 0;
  }, [stream]);

  const startScreenShare = async () => {
    setError(null);
    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setStream(captured);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Screen share failed");
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
  };

  return {
    isSharing,
    screenAudioOn,
    error,
    startScreenShare,
    stopScreenShare,
  };
}
