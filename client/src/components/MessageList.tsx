import { useEffect, useRef } from 'react';
import type { Message } from '../../../shared/types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messages" ref={containerRef}>
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`message ${msg.userId === currentUserId ? 'own' : ''}`}
        >
          <div className="sender">{msg.nickname}</div>
          <div className="content">{msg.content}</div>
          <div className="time">{formatTime(msg.timestamp)}</div>
        </div>
      ))}
      {messages.length === 0 && (
        <div className="no-messages">No messages yet. Start the conversation!</div>
      )}
    </div>
  );
}
