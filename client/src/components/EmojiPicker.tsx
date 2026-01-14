interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_LIST = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '👀', '💯', '✅', '❌',
  '👏', '🙌', '💪', '🤔', '😍', '🥳',
  '😎', '🤣', '😊', '🙏', '💕', '✨'
];

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div className="emoji-picker">
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          className="emoji-btn"
          onClick={() => onSelect(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
