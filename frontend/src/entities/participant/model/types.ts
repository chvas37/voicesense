export interface Participant {
  userId: string;
  roomId: string;
  micOn: boolean;
  screenOn: boolean;
  screenAudioOn: boolean;
  joinedAt: string;
}
