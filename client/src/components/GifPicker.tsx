import { useState, useEffect, useCallback } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    gif: {
      url: string;
    };
    tinygif: {
      url: string;
    };
  };
  content_description: string;
}

// Tenor API - free tier, no key required for limited usage
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor key
const TENOR_API_BASE = 'https://tenor.googleapis.com/v2';

const CATEGORIES = ['Trending', 'Reactions', 'Funny', 'Love', 'Celebrate', 'Animals', 'Memes', 'Fail'];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Trending');

  // Fetch featured/trending GIFs
  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${TENOR_API_BASE}/featured?key=${TENOR_API_KEY}&limit=24&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();
      setGifs(data.results || []);
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
        `${TENOR_API_BASE}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=24&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();
      setGifs(data.results || []);
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
  const handleGifClick = (gif: TenorGif) => {
    onSelect(gif.media_formats.gif.url);
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
              title={gif.content_description}
            >
              <img
                src={gif.media_formats.tinygif.url}
                alt={gif.content_description}
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

      {/* Powered by Tenor */}
      <div style={{
        marginTop: '8px',
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-tertiary)',
        opacity: 0.7
      }}>
        Powered by Tenor
      </div>
    </div>
  );
}
