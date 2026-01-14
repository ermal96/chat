import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Message } from '../../../shared/types';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';
import { MemePicker } from './MemePicker';

interface MessageInputProps {
  onSend: (content: string, imageUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
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
  onCancelReply
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showMeme, setShowMeme] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

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

          <input
            ref={inputRef}
            type="text"
            placeholder={replyingTo ? `Reply to ${replyingTo.nickname}...` : 'Type a message... (try /mock /loud /uwu)'}
            value={content}
            onChange={e => {
              setContent(e.target.value);
              handleTyping();
            }}
            autoComplete="off"
          />

          <button type="submit" className="send-btn" disabled={!content.trim()}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

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
