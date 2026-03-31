export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  body: string;
  clientId: string | null;
  createdAt: string;
}

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}
