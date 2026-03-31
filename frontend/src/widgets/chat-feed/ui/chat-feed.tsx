"use client";

import { Message } from "@/entities/message/model/types";

interface ChatFeedProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatFeed({ messages, isLoading }: ChatFeedProps) {
  if (isLoading) {
    return (
      <section className="panel chatPanel">
        <h3>Chat</h3>
        <p>Loading history...</p>
      </section>
    );
  }

  return (
    <section className="panel chatPanel">
      <h3>Chat</h3>
      <div className="chatList">
        {messages.length === 0 ? <p>No messages yet.</p> : null}
        {messages.map((message) => (
          <article className="chatMessage" key={message.id}>
            <div className="chatMeta">
              <strong>{message.authorName}</strong>
              <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
            </div>
            <p>{message.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
