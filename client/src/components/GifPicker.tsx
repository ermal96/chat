import { useState, useEffect, useCallback } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
    };
  };
  title: string;
}

// Giphy API key - public beta key for development
const GIPHY_API_KEY = 'dc6zaTOxFJmzC';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

const CATEGORIES = ['Trending', 'Reactions', 'Funny', 'Love', 'Celebrate', 'Animals', 'Memes', 'Fail'];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Trending');

  // Fetch trending GIFs
  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_API_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch trending GIFs:', error);
      setGifs([]);
    }
    setLoading(false);
  }, []);

  // Search GIFs
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchTrending();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to search GIFs:', error);
      setGifs([]);
    }
    setLoading(false);
  }, [fetchTrending]);

  // Load trending on mount
  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchGifs(searchQuery);
        setActiveCategory('');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchGifs]);

  // Handle category click
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setSearchQuery('');
    if (category === 'Trending') {
      fetchTrending();
    } else {
      searchGifs(category);
    }
  };

  // Handle GIF selection
  const handleGifClick = (gif: GiphyGif) => {
    onSelect(gif.images.original.url);
  };

  return (
    <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
      {/* Search input */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search GIFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
          autoFocus
        />
      </div>

      {/* Categories */}
      <div className="gif-picker-header" style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            style={{
              padding: '5px 10px',
              background: activeCategory === cat ? 'var(--primary)' : 'var(--bg-hover)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GIF grid */}
      <div className="gif-grid" style={{ minHeight: '200px' }}>
        {loading ? (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            Loading GIFs...
          </div>
        ) : gifs.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            No GIFs found
          </div>
        ) : (
          gifs.map((gif) => (
            <div
              key={gif.id}
              className="gif-item"
              onClick={() => handleGifClick(gif)}
              title={gif.title}
            >
              <img
                src={gif.images.fixed_height.url}
                alt={gif.title}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* Powered by Giphy */}
      <div style={{
        marginTop: '8px',
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-tertiary)',
        opacity: 0.7
      }}>
        Powered by GIPHY
      </div>
    </div>
  );
}
