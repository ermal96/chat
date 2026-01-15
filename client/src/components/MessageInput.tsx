import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Message, UserInfo } from '../../../shared/types';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';
import { MemePicker } from './MemePicker';

interface MessageInputProps {
  onSend: (content: string, imageUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  members?: UserInfo[];
  currentUserId?: string;
}

// Text transformation functions
const textTransforms: Record<string, (text: string) => string> = {
  '/mock': (text) => text.split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join(''), // sPoNgEbOb
  '/loud': (text) => text.toUpperCase() + '!!!',
  '/whisper': (text) => text.toLowerCase() + '...',
  '/uwu': (text) => text.replace(/[lr]/g, 'w').replace(/[LR]/g, 'W').replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1') + ' uwu',
  '/reverse': (text) => text.split('').reverse().join(''),
  '/clap': (text) => text.split(' ').join(' 👏 '),
  '/b': (text) => '🅱️' + text.slice(1), // B emoji meme
};

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
  members = [],
  currentUserId
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showMeme, setShowMeme] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter members for mention autocomplete (exclude current user)
  const filteredMembers = members
    .filter(m => m.id !== currentUserId)
    .filter(m => m.nickname.toLowerCase().includes(mentionSearch.toLowerCase()));

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Reset mention index when filtered members change
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSearch]);

  const handleTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 2000);
  };

  const processTextCommands = (text: string): string => {
    // Check for text transform commands
    for (const [cmd, transform] of Object.entries(textTransforms)) {
      if (text.startsWith(cmd + ' ')) {
        return transform(text.slice(cmd.length + 1));
      }
    }
    return text;
  };

  const handleInputChange = (value: string) => {
    setContent(value);
    handleTyping();

    // Check for @ mention trigger
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentions(true);
      closeAllPickers();
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const insertMention = (nickname: string) => {
    const cursorPos = inputRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);

    // Find the @ position
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newContent = `${beforeMention}@${nickname} ${textAfterCursor}`;
      setContent(newContent);
    }

    setShowMentions(false);
    setMentionSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].nickname);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }

    // Process any text commands
    const processedContent = processTextCommands(content.trim());
    onSend(processedContent);
    setContent('');
    setShowMentions(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    setShowGif(false);
    onSend('', gifUrl);
  };

  const handleMemeSelect = (memeUrl: string) => {
    setShowMeme(false);
    onSend('', memeUrl);
  };

  const applyTextTransform = (cmd: string) => {
    if (content.trim()) {
      const transformed = textTransforms[cmd](content);
      setContent(transformed);
    }
    setShowTextMenu(false);
    inputRef.current?.focus();
  };

  const closeAllPickers = () => {
    setShowEmoji(false);
    setShowGif(false);
    setShowMeme(false);
    setShowTextMenu(false);
  };

  return (
    <div className="message-input-container" ref={containerRef}>
      {replyingTo && (
        <div className="reply-bar">
          <div className="reply-info">
            <span className="reply-label">Replying to</span>
            <span className="reply-author">{replyingTo.nickname}</span>
            <span className="reply-preview">{replyingTo.content.slice(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}</span>
          </div>
          <button className="cancel-reply" onClick={onCancelReply} type="button">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      )}

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowEmoji(!showEmoji);
            }}
            title="Emoji"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowGif(!showGif);
            }}
            title="GIF"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11.5 9H13v6h-1.5V9zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1h3z"/>
            </svg>
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowMeme(!showMeme);
            }}
            title="Stickers"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M21.97 13.52v-.04C23.21 12.38 24 10.78 24 9c0-3.31-2.69-6-6-6-.26 0-.52.02-.78.06C16.19 1.23 14.24 0 12 0S7.81 1.23 6.78 3.06C6.52 3.02 6.26 3 6 3c-3.31 0-6 2.69-6 6 0 1.78.79 3.38 2.02 4.48v.04C.79 14.62 0 16.22 0 18c0 3.31 2.69 6 6 6 1.39 0 2.67-.48 3.69-1.28.74.18 1.51.28 2.31.28s1.57-.1 2.31-.28c1.02.8 2.3 1.28 3.69 1.28 3.31 0 6-2.69 6-6 0-1.78-.79-3.38-2.03-4.48zM12 21c-4.41 0-8-3.59-8-8 0-3.45 2.2-6.39 5.27-7.51.45-.14.91-.26 1.39-.34C11.1 5.05 11.54 5 12 5s.9.05 1.34.15c.48.08.94.2 1.39.34C17.8 6.61 20 9.55 20 13c0 4.41-3.59 8-8 8z"/>
            </svg>
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowTextMenu(!showTextMenu);
            }}
            title="Format"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M5 17v2h14v-2H5zm4.5-4.2h5l.9 2.2h2.1L12.75 4h-1.5L6.5 15h2.1l.9-2.2zM12 5.98L13.87 11h-3.74L12 5.98z"/>
            </svg>
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              // Insert @ at cursor position
              const cursorPos = inputRef.current?.selectionStart || content.length;
              const newContent = content.slice(0, cursorPos) + '@' + content.slice(cursorPos);
              setContent(newContent);
              setShowMentions(true);
              setMentionSearch('');
              closeAllPickers();
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            title="Mention"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={replyingTo ? `Reply to ${replyingTo.nickname}...` : 'Type a message... (use @ to mention)'}
            value={content}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />

          <button type="submit" className="send-btn" disabled={!content.trim()}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        {/* Mention Autocomplete */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="mention-autocomplete">
            <div className="mention-header">Mention someone</div>
            {filteredMembers.slice(0, 6).map((member, index) => (
              <div
                key={member.id}
                className={`mention-item ${index === mentionIndex ? 'active' : ''}`}
                onClick={() => insertMention(member.nickname)}
              >
                <span className="mention-avatar" style={{ background: member.avatar || '#6264a7' }}>
                  {member.nickname.slice(0, 2).toUpperCase()}
                </span>
                <span className="mention-name">{member.nickname}</span>
                {member.isOnline && <span className="mention-online">●</span>}
              </div>
            ))}
          </div>
        )}

        {showEmoji && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}

        {showGif && (
          <div className="emoji-picker-wrapper">
            <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />
          </div>
        )}

        {showMeme && (
          <div className="emoji-picker-wrapper">
            <MemePicker onSelect={handleMemeSelect} onClose={() => setShowMeme(false)} />
          </div>
        )}

        {showTextMenu && (
          <div className="emoji-picker-wrapper">
            <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
              <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                Text Format
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => applyTextTransform('/mock')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>sPoNgEbOb</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>Alternating case</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/loud')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>UPPERCASE</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>All caps with emphasis</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/whisper')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>lowercase</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>Quiet text style</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/reverse')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>Reverse</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>Backwards text</span>
                </button>
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Type your message first, then click a format option.
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
