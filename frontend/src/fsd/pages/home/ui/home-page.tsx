"use client";

import { useEffect, useState } from "react";

import { Room } from "@/entities/room/model/types";
import { joinAsGuest } from "@/features/join-as-guest/model/join-as-guest";
import { JoinAsGuestForm } from "@/features/join-as-guest/ui/join-as-guest-form";
import { getPersistentRooms } from "@/features/select-room/model/get-persistent-rooms";
import { RoomSelector } from "@/features/select-room/ui/room-selector";
import { MessageInput } from "@/features/send-message/ui/message-input";
import { useRoomChat } from "@/features/load-chat-history/model/use-room-chat";
import { useVoiceConnection } from "@/features/connect-voice/model/use-voice-connection";
import { useScreenShare } from "@/features/screen-share/model/use-screen-share";
import { useSessionBootstrap } from "@/processes/session-bootstrap/model/use-session-bootstrap";
import { ChatFeed } from "@/widgets/chat-feed/ui/chat-feed";
import { ParticipantsList } from "@/widgets/participants-list/ui/participants-list";
import { RoomHeader } from "@/widgets/room-header/ui/room-header";
import { ScreenSharePanelWidget } from "@/widgets/screen-share-panel/ui/screen-share-panel-widget";
import { VoiceControlsWidget } from "@/widgets/voice-controls/ui/voice-controls-widget";

export default function HomePage() {
  const { isLoading, accessToken, user, setSession, resetSession } = useSessionBootstrap();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const { isConnecting, isConnected, error: voiceError, connect, disconnect } = useVoiceConnection();
  const {
    isSharing,
    screenAudioOn,
    error: screenShareError,
    startScreenShare,
    stopScreenShare,
  } = useScreenShare();

  useEffect(() => {
    if (!accessToken || selectedRoom) {
      return;
    }

    let cancelled = false;

    const loadRooms = async () => {
      try {
        const loadedRooms = await getPersistentRooms(accessToken);
        if (!cancelled) {
          setRooms(loadedRooms);
          setRoomsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRoomsError(error instanceof Error ? error.message : "Failed to load rooms");
        }
      }
    };

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedRoom]);

  if (isLoading) {
    return <main className="shell">Loading session...</main>;
  }

  if (!accessToken || !user) {
    return (
      <main className="shell">
        <h1>VoiceSense</h1>
        <JoinAsGuestForm
          onSubmit={async (displayName) => {
            const response = await joinAsGuest(displayName);
            setSession({
              accessToken: response.access_token,
              refreshToken: response.refresh_token,
              user: response.user,
            });
          }}
        />
      </main>
    );
  }

  if (!selectedRoom) {
    return (
      <main className="shell">
        <h1>VoiceSense</h1>
        {roomsError ? <p className="error">{roomsError}</p> : null}
        <RoomSelector rooms={rooms} onSelect={setSelectedRoom} />
      </main>
    );
  }

  return (
    <RoomSession
      room={selectedRoom}
      accessToken={accessToken}
      userName={user.displayName}
      onLeaveRoom={() => {
        disconnect();
        stopScreenShare();
        setSelectedRoom(null);
      }}
      onSignOut={() => {
        disconnect();
        stopScreenShare();
        setSelectedRoom(null);
        resetSession();
      }}
      voiceState={{
        isConnecting,
        isConnected,
        error: voiceError,
        onConnect: () => connect(selectedRoom.id, accessToken),
        onDisconnect: disconnect,
      }}
      screenShareState={{
        isSharing,
        screenAudioOn,
        error: screenShareError,
        onStart: startScreenShare,
        onStop: stopScreenShare,
      }}
    />
  );
}

interface RoomSessionProps {
  room: Room;
  accessToken: string;
  userName: string;
  onLeaveRoom: () => void;
  onSignOut: () => void;
  voiceState: {
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    onConnect: () => Promise<void>;
    onDisconnect: () => void;
  };
  screenShareState: {
    isSharing: boolean;
    screenAudioOn: boolean;
    error: string | null;
    onStart: () => Promise<void>;
    onStop: () => void;
  };
}

function RoomSession({
  room,
  accessToken,
  userName,
  onLeaveRoom,
  onSignOut,
  voiceState,
  screenShareState,
}: RoomSessionProps) {
  const { messages, participants, isLoading, error, sendMessage } = useRoomChat({
    roomId: room.id,
    accessToken,
  });

  return (
    <main className="shell">
      <RoomHeader room={room} userName={userName} onLeaveRoom={onLeaveRoom} onSignOut={onSignOut} />
      <div className="gridLayout">
        <div className="stack">
          <VoiceControlsWidget {...voiceState} />
          <ScreenSharePanelWidget {...screenShareState} />
          <ParticipantsList participants={participants} />
        </div>
        <div className="stack">
          {error ? <p className="error">{error}</p> : null}
          <ChatFeed messages={messages} isLoading={isLoading} />
          <MessageInput onSend={sendMessage} disabled={false} />
        </div>
      </div>
    </main>
  );
}
