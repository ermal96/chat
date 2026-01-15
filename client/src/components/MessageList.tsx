import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../../shared/types';
import { getAvatarColor, getInitials } from '../../../shared/types';
import { EmojiPicker } from './EmojiPicker';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  currentUserNickname: string;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}

// Render message content with highlighted mentions
function renderMessageContent(content: string, currentUserNickname: string): React.ReactNode {
  // Match @username patterns
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const mentionedName = match[1];
    const isSelfMention = mentionedName.toLowerCase() === currentUserNickname.toLowerCase();

    // Add the mention as a highlighted span
    parts.push(
      <span
        key={match.index}
        className={`mention ${isSelfMention ? 'mention-self' : ''}`}
      >
        @{mentionedName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

// Hook to get remaining time until expiry
function useExpiryTimer(expiresAt: string | undefined): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const updateRemaining = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setRemaining(null);
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;

      if (minutes > 0) {
        setRemaining(`${minutes}m ${secs}s`);
      } else {
        setRemaining(`${secs}s`);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

function MessageExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  const remaining = useExpiryTimer(expiresAt);

  if (!remaining) return null;

  return (
    <span className="expiry-badge">
      {remaining}
    </span>
  );
}

export function MessageList({
  messages,
  currentUserId,
  currentUserNickname,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onReply
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowEmojiPicker(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setContextMenu(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      onEditMessage(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (messageId: string) => {
    if (confirm('Delete this message?')) {
      onDeleteMessage(messageId);
    }
    setContextMenu(null);
  };

  const handleReactionClick = (messageId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleEmojiSelect = (messageId: string, emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const isGif = (url: string) => {
    return url.includes('.gif') || url.includes('giphy.com');
  };

  return (
    <div className="messages" ref={containerRef}>
      {messages.map((msg, index) => {
        const isOwn = msg.userId === currentUserId;
        const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;
        const avatarColor = getAvatarColor(msg.userId);

        return (
          <div
            key={msg.id}
            className={`message ${isOwn ? 'own' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, msg.id)}
          >
            {!isOwn && showAvatar && (
              <div className="message-avatar" style={{ backgroundColor: avatarColor }}>
                {getInitials(msg.nickname)}
              </div>
            )}
            {!isOwn && !showAvatar && <div className="message-avatar-spacer" />}

            <div className="message-content-wrapper">
              {showAvatar && !isOwn && (
                <div className="message-sender">{msg.nickname}</div>
              )}

              {msg.replyTo && (
                <div className="reply-preview">
                  <span className="reply-author">{msg.replyTo.nickname}</span>
                  <span className="reply-text">{msg.replyTo.content}</span>
                </div>
              )}

              <div className="message-bubble">
                {editingId === msg.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button onClick={handleSaveEdit} className="save">Save</button>
                      <button onClick={handleCancelEdit} className="cancel">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content && <div className="message-text">{renderMessageContent(msg.content, currentUserNickname)}</div>}
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt={isGif(msg.imageUrl) ? "GIF" : "Image"}
                        className="message-image"
                        onClick={() => setExpandedImage(msg.imageUrl!)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                    <div className="message-meta">
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                      {msg.edited && <span className="edited-badge">edited</span>}
                      <MessageExpiryBadge expiresAt={msg.expiresAt} />
                    </div>
                  </>
                )}
              </div>

              {/* Reactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="reactions">
                  {msg.reactions.map((reaction) => {
                    const hasReacted = reaction.users.some(u => u.id === currentUserId);
                    const userNames = reaction.users.map(u => u.nickname).join(', ');
                    return (
                      <button
                        key={reaction.emoji}
                        className={`reaction ${hasReacted ? 'active' : ''}`}
                        onClick={() => handleReactionClick(msg.id, reaction.emoji, hasReacted)}
                        title={userNames}
                      >
                        <span className="reaction-emoji">{reaction.emoji}</span>
                        <span className="reaction-count">{reaction.users.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Reactions Bar */}
              <div className="message-actions">
                <div className="quick-reactions">
                  {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                    <button
                      key={emoji}
                      className="quick-reaction-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddReaction(msg.id, emoji);
                      }}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id);
                  }}
                  title="More reactions"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply(msg);
                  }}
                  title="Reply"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                  </svg>
                </button>
                {isOwn && (
                  <>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(msg);
                      }}
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(msg.id);
                      }}
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker === msg.id && (
                <div className="emoji-picker-container" onClick={(e) => e.stopPropagation()}>
                  <EmojiPicker onSelect={(emoji) => handleEmojiSelect(msg.id, emoji)} />
                </div>
              )}
            </div>

            {isOwn && showAvatar && (
              <div className="message-avatar" style={{ backgroundColor: avatarColor }}>
                {getInitials(msg.nickname)}
              </div>
            )}
            {isOwn && !showAvatar && <div className="message-avatar-spacer" />}
          </div>
        );
      })}

      {messages.length === 0 && (
        <div className="no-messages">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
          </div>
          <p>No messages yet</p>
          <p className="subtitle">Start the conversation by sending a message</p>
          <p className="subtitle" style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>Tip: Use @ to mention people</p>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) onReply(msg);
            setContextMenu(null);
          }}>
            Reply
          </button>
          {messages.find(m => m.id === contextMenu.messageId)?.userId === currentUserId && (
            <>
              <button onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.messageId);
                if (msg) handleEdit(msg);
              }}>
                Edit
              </button>
              <button className="danger" onClick={() => handleDelete(contextMenu.messageId)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="modal-overlay"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
