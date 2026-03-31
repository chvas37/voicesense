"use client";

import { useEffect, useMemo, useState } from "react";

import { Message, MessagePage } from "@/entities/message/model/types";
import { httpJson } from "@/shared/api/http";
import { getWsBaseUrl } from "@/shared/lib/ws";

interface UseRoomChatParams {
  roomId: string;
  accessToken: string;
}

interface PresenceSnapshotPayload {
  roomId: string;
  members: string[];
}

interface ChatEvent {
  type: string;
  payload: Message | PresenceSnapshotPayload | { userId: string; roomId: string };
}

export function useRoomChat({ roomId, accessToken }: UseRoomChatParams) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsUrl = useMemo(() => `${getWsBaseUrl()}/ws/v1/rooms/${roomId}?token=${accessToken}`, [roomId, accessToken]);

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const page = await httpJson<MessagePage>(`/api/v1/rooms/${roomId}/messages?limit=50`, {
          token: accessToken,
        });

        if (!cancelled) {
          setMessages(page.items);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [roomId, accessToken]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ChatEvent;

        if (parsed.type === "chat.message.created") {
          const message = parsed.payload as Message;
          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
        }

        if (parsed.type === "room.presence.snapshot") {
          const payload = parsed.payload as PresenceSnapshotPayload;
          setParticipants(payload.members);
        }

        if (parsed.type === "room.participant.joined") {
          const payload = parsed.payload as { userId: string };
          setParticipants((prev) => Array.from(new Set([...prev, payload.userId])));
        }

        if (parsed.type === "room.participant.left") {
          const payload = parsed.payload as { userId: string };
          setParticipants((prev) => prev.filter((id) => id !== payload.userId));
        }
      } catch {
        // Ignore malformed events from transport.
      }
    };

    ws.onclose = () => {
      // Keep minimal behavior in Sprint 1 without auto reconnect logic.
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  const sendMessage = async (body: string) => {
    const clientId = crypto.randomUUID();
    await httpJson<Message>(`/api/v1/rooms/${roomId}/messages`, {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({
        body,
        clientId,
      }),
    });
  };

  return {
    messages,
    participants,
    isLoading,
    error,
    sendMessage,
  };
}
