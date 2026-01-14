import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import type { Message } from '../../../shared/types';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';

interface MessageInputProps {
  onSend: (content: string, imageUrl?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
}

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const hasContent = content.trim().length > 0;
    const hasImage = imagePreview !== null;

    if (!hasContent && !hasImage) return;

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }

    onSend(content.trim(), imagePreview || undefined);
    setContent('');
    setImagePreview(null);
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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for preview and sending
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="message-input-container">
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

      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Preview" />
          <button className="remove-image" onClick={removeImage} type="button">✕</button>
        </div>
      )}

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              setShowEmoji(!showEmoji);
              setShowGif(false);
            }}
            title="Emoji"
          >
            😊
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={() => {
              setShowGif(!showGif);
              setShowEmoji(false);
            }}
            title="GIF"
          >
            GIF
          </button>

          <button
            type="button"
            className="input-action-btn"
            onClick={handleImageClick}
            title="Upload Image"
          >
            📷
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <input
            ref={inputRef}
            type="text"
            placeholder={replyingTo ? `Reply to ${replyingTo.nickname}...` : 'Type a message...'}
            value={content}
            onChange={e => {
              setContent(e.target.value);
              handleTyping();
            }}
            autoComplete="off"
          />

          <button type="submit" className="send-btn" disabled={!content.trim() && !imagePreview}>
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
      </form>
    </div>
  );
}
