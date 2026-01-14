import { useState, useEffect, useCallback } from 'react';

interface MemePickerProps {
  onSelect: (memeUrl: string) => void;
  onClose: () => void;
}

interface RedditPost {
  data: {
    url: string;
    title: string;
    post_hint?: string;
    is_video: boolean;
  };
}

// Popular meme subreddits
const MEME_SUBREDDITS = ['memes', 'dankmemes', 'wholesomememes', 'me_irl', 'funny'];

// Popular meme stickers
const MEME_STICKERS = [
  { name: 'This is Fine', url: 'https://i.imgur.com/c4jt321.png' },
  { name: 'Surprised Pikachu', url: 'https://i.imgur.com/sohWhy9.png' },
  { name: 'Drake No/Yes', url: 'https://i.imgur.com/V6GJmvp.png' },
  { name: 'Distracted BF', url: 'https://i.imgur.com/mONaHzL.png' },
  { name: 'Roll Safe', url: 'https://i.imgur.com/ri9OILU.png' },
  { name: 'Stonks', url: 'https://i.imgur.com/IxmzXE8.png' },
  { name: 'Not Stonks', url: 'https://i.imgur.com/fcHvIeP.png' },
  { name: 'Woman Yelling', url: 'https://i.imgur.com/fMGer46.png' },
  { name: 'Change My Mind', url: 'https://i.imgur.com/DpYHHHd.png' },
  { name: 'Always Has Been', url: 'https://i.imgur.com/t6jjLNO.png' },
  { name: 'Panik Kalm', url: 'https://i.imgur.com/5G4TBGA.png' },
  { name: 'Sad Pablo', url: 'https://i.imgur.com/m4beFaD.png' },
];

export function MemePicker({ onSelect, onClose }: MemePickerProps) {
  const [memes, setMemes] = useState<{ url: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'random' | 'stickers'>('random');
  const [activeSubreddit, setActiveSubreddit] = useState('memes');

  // Fetch memes from Reddit
  const fetchMemes = useCallback(async (subreddit: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`
      );
      const data = await response.json();

      const imageMemes = data.data.children
        .filter((post: RedditPost) => {
          const url = post.data.url;
          return (
            !post.data.is_video &&
            (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.includes('i.redd.it') || url.includes('i.imgur.com'))
          );
        })
        .map((post: RedditPost) => ({
          url: post.data.url,
          title: post.data.title
        }))
        .slice(0, 12);

      setMemes(imageMemes);
    } catch (error) {
      console.error('Failed to fetch memes:', error);
      setMemes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'random') {
      fetchMemes(activeSubreddit);
    }
  }, [activeTab, activeSubreddit, fetchMemes]);

  const handleMemeClick = (url: string) => {
    onSelect(url);
  };

  const handleStickerClick = (url: string) => {
    onSelect(url);
  };

  const handleRandomMeme = async () => {
    setLoading(true);
    try {
      const randomSub = MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
      const response = await fetch(
        `https://www.reddit.com/r/${randomSub}/random.json`
      );
      const data = await response.json();

      // Reddit returns array for random
      const post = Array.isArray(data) ? data[0]?.data?.children?.[0]?.data : data?.data?.children?.[0]?.data;

      if (post && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif') || post.url.includes('i.redd.it'))) {
        onSelect(post.url);
      } else {
        // Fallback - fetch from hot
        await fetchMemes(randomSub);
        if (memes.length > 0) {
          const randomMeme = memes[Math.floor(Math.random() * memes.length)];
          onSelect(randomMeme.url);
        }
      }
    } catch (error) {
      console.error('Failed to fetch random meme:', error);
    }
    setLoading(false);
  };

  return (
    <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('random')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'random' ? 'var(--primary)' : 'var(--bg-hover)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🔥 Hot Memes
        </button>
        <button
          onClick={() => setActiveTab('stickers')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'stickers' ? 'var(--primary)' : 'var(--bg-hover)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          😂 Stickers
        </button>
      </div>

      {activeTab === 'random' && (
        <>
          {/* Random meme button */}
          <button
            onClick={handleRandomMeme}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {loading ? '🎲 Loading...' : '🎲 Random Meme!'}
          </button>

          {/* Subreddit selector */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {MEME_SUBREDDITS.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubreddit(sub)}
                style={{
                  padding: '4px 8px',
                  background: activeSubreddit === sub ? 'var(--primary)' : 'var(--bg-hover)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                r/{sub}
              </button>
            ))}
          </div>

          {/* Meme grid */}
          <div className="gif-grid" style={{ minHeight: '150px' }}>
            {loading ? (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-secondary)'
              }}>
                Loading memes...
              </div>
            ) : memes.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: 'var(--text-secondary)'
              }}>
                No memes found
              </div>
            ) : (
              memes.map((meme, index) => (
                <div
                  key={index}
                  className="gif-item"
                  onClick={() => handleMemeClick(meme.url)}
                  title={meme.title}
                >
                  <img
                    src={meme.url}
                    alt={meme.title}
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
        </>
      )}

      {activeTab === 'stickers' && (
        <div className="gif-grid">
          {MEME_STICKERS.map((sticker, index) => (
            <div
              key={index}
              className="gif-item"
              onClick={() => handleStickerClick(sticker.url)}
              title={sticker.name}
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  background: 'var(--bg-secondary)',
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '8px',
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-tertiary)',
        opacity: 0.7
      }}>
        Powered by Reddit
      </div>
    </div>
  );
}
