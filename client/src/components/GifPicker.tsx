import { useState } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Popular GIFs - you can replace with Tenor/GIPHY API integration
const POPULAR_GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDJ5eWU2bWI2YnF6ZjVjMWNyNnh2aTJ3NnRtYjBsZWliaXBlY2N2aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWM2a3J6ZWR5NWdqMXJ1YTN3djA5dWx5a3o4cTZsaWV3ajN2eTFjZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt6ML6BklcajjsA/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTRyYzNxNnc4YzI0OTBybWQzeGJjdnBra2R4eXZ1ZWJhZjd2NnFkYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26gsspfbt1HfVQ9va/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3ZwcnZpMzNhcnBxMDJ5YTRxbWoyOXQ3ZG9sMnA2ejV2c21yNXZmciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LOnt6uqjD9OexmQJRB/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaW95OGpmZXB4ZjB5ZHFyeGJ3dTd1cGVqcXQ2NTJqYmNrNWpsMGJxeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xiMUwBRn5RDLhzwO80/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHI0a3JmZmE5cXN1a2xjdTc1ZXNlYTQ5MWE5dWJ4ajIyMTVxNnI1aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xUPOqo6E1XvWXwlCyQ/giphy.gif',
];

// Categories with more GIFs
const GIF_CATEGORIES: { name: string; gifs: string[] }[] = [
  {
    name: 'Reactions',
    gifs: [
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTNrMXBmZ2VqNTl6bWU5ZGpqNnBwNXFyMjJnaXFscjUxcm5maDY2ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKwmnDgQb5jemjK/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXB0M2pzOXV0N2x5dG5iMnV6ajZyeHZxYmJjbGJ2ZnhqYXRqajZoZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt4HU9uwXmXSAuI/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXRocXp5Y3BkcHB3OWlnZjY4YjM4cjl3NnJ5MjBucGM2MHhwa29lcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41lGvinEgARjB2HC/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXB4c2xqc2RpN2IyY2syNTFhZ3E3YmJvdWd2bXE3NWNqaHJ0eXVmeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7qDSOvfaCO9b3MlO/giphy.gif',
    ]
  },
  {
    name: 'Celebrate',
    gifs: [
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWRqbTVnNWQxMjkxbWc5NjBsbHJzY2dzYXQ3NDQ0ZWNkMHB5YnFiNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g9582DNuQppxC/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3p5eWR3cWNmeXp5aWQ2ZmN5Yml1ZGxrdTJqOW51cjhub2t3bWlqbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaW5namZsMmZ3bnBsaXEybXRtZzRhaDFpdDNmeGpiZmZkOHN0NXdkeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4cqiYI30juCOGY/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3h3YWE5cXB3eGZ4cW5mdW1qOGprNWJwcjE3YjE3NGQ0OGViOTFqcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyau7QcKtKUYIda/giphy.gif',
    ]
  },
  {
    name: 'Love',
    gifs: [
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzl1ZGxjZ3NiZGZyM3J4bHJ2c2hqYTg0cjFtczlwdG42d2JscGtxOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4pTdcifPZLpDjL1e/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZW5vbmxhMGttNjBhemltMWs2azJ3MTdqdzRqN24zNjZwcWFvdTRhNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI4sFlp73fvEYgw/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2dhdWd5dGRqb3Fuc2ZzZnBhYWs1eXk5dTBoejQ4cTdob2hvNm8wdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzBrenRvMnJmdnZwMWJnY3VkMXJxdHBjN2NiaDVqZml4MThocG9yMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYGb1LuZ3n7dRnO/giphy.gif',
    ]
  }
];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleGifClick = (gifUrl: string) => {
    onSelect(gifUrl);
  };

  const displayGifs = activeCategory
    ? GIF_CATEGORIES.find(c => c.name === activeCategory)?.gifs || []
    : POPULAR_GIFS;

  return (
    <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
      <div className="gif-picker-header" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: '6px 12px',
            background: !activeCategory ? 'var(--primary)' : 'var(--bg-hover)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Popular
        </button>
        {GIF_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            style={{
              padding: '6px 12px',
              background: activeCategory === cat.name ? 'var(--primary)' : 'var(--bg-hover)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="gif-grid">
        {displayGifs.map((gif, index) => (
          <div
            key={index}
            className="gif-item"
            onClick={() => handleGifClick(gif)}
          >
            <img src={gif} alt="GIF" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
