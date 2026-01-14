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
            ✕
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
            😊
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
            GIF
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowMeme(!showMeme);
            }}
            title="Memes"
            style={{ fontSize: '12px' }}
          >
            🔥
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              closeAllPickers();
              setShowTextMenu(!showTextMenu);
            }}
            title="Text Effects"
            style={{ fontSize: '11px', fontWeight: 'bold' }}
          >
            Aa
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
            title="Mention someone"
            style={{ fontSize: '14px', fontWeight: 'bold' }}
          >
            @
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
                ✨ Text Effects
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => applyTextTransform('/mock')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>sPoNgEbOb</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>mOcKiNg TeXt</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/loud')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>LOUD!!!</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>SCREAM YOUR MESSAGE</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/whisper')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>whisper...</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>quiet voice...</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/uwu')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>UwU</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>kawaii text uwu</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/clap')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>👏 Clap 👏</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>emphasis 👏 between 👏 words</span>
                </button>
                <button
                  onClick={() => applyTextTransform('/reverse')}
                  className="text-effect-btn"
                  disabled={!content.trim()}
                >
                  <span style={{ fontWeight: 600 }}>esreveR</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>backwards text</span>
                </button>
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                💡 Type your message first, then click an effect!<br/>
                Or use commands: /mock /loud /uwu /clap /whisper /reverse
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
