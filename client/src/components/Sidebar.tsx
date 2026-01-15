import { useState } from 'react';
import type { Room } from '../../../shared/types';
import { getAvatarColor, getInitials } from '../../../shared/types';

interface SidebarProps {
  rooms: Map<string, Room>;
  currentRoom: Room | null;
  user: { id: string; nickname: string };
  onSelectRoom: (room: Room) => void;
  onNewRoom: () => void;
  onEditNickname: () => void;
  onLogout: () => void;
  showMobile?: boolean;
  onCloseMobile?: () => void;
}

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '😂', label: 'LOL' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '💻', label: 'Working' },
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🎵', label: 'Vibing' },
  { emoji: '☕', label: 'Coffee' },
];

export function Sidebar({
  rooms,
  currentRoom,
  user,
  onSelectRoom,
  onNewRoom,
  onEditNickname,
  onLogout,
  showMobile
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [currentMood, setCurrentMood] = useState<{ emoji: string; label: string } | null>(null);
  const avatarColor = getAvatarColor(user.id);

  // Filter rooms based on search query
  const filteredRooms = Array.from(rooms.values()).filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`sidebar ${showMobile ? 'show-mobile' : ''}`}>
      <div className="sidebar-header">
        <h2>✨ Meme Chat</h2>
        <button className="btn-icon" onClick={onNewRoom} title="New Chat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn-icon small"
              onClick={() => setSearchQuery('')}
              style={{ width: '24px', height: '24px', padding: '0' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="chats-section">
        <div className="section-header">
          <span>💬 Chats ({filteredRooms.length})</span>
        </div>

        <ul className="room-list">
          {filteredRooms.map(room => (
            <li
              key={room.id}
              className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => onSelectRoom(room)}
            >
              <div className="room-avatar" style={{ background: `linear-gradient(135deg, ${getAvatarColor(room.id)}, ${getAvatarColor(room.id + 'alt')})` }}>
                {getInitials(room.name)}
              </div>
              <div className="room-content">
                <div className="room-name">{room.name}</div>
                <div className="room-meta">
                  <span>👥 {room.memberCount || 1}</span>
                  {room.onlineCount && room.onlineCount > 0 && (
                    <span style={{ color: 'var(--online)' }}>● {room.onlineCount} online</span>
                  )}
                </div>
              </div>
              {room.unreadCount && room.unreadCount > 0 && (
                <div className="unread-badge notification-badge">
                  {room.unreadCount > 99 ? '99+' : room.unreadCount}
                </div>
              )}
            </li>
          ))}

          {filteredRooms.length === 0 && searchQuery && (
            <li className="no-items">
              <p>🔍 No chats found</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Try a different search</p>
            </li>
          )}

          {rooms.size === 0 && !searchQuery && (
            <li className="no-items">
              <p>🎉 Welcome to Meme Chat!</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Start sharing memes with friends
              </p>
              <button className="btn small primary" onClick={onNewRoom}>
                ➕ Create a chat
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="user-section" style={{ position: 'relative' }}>
        <div
          className="user-avatar"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, #8b5cf6)`, cursor: 'pointer' }}
          onClick={() => setShowMoodPicker(!showMoodPicker)}
          title="Set your mood"
        >
          {currentMood ? currentMood.emoji : getInitials(user.nickname)}
        </div>
        <div className="user-info">
          <span className="user-name" onClick={onEditNickname} style={{ cursor: 'pointer' }} title="Click to change nickname">
            {user.nickname}
          </span>
          <span className="user-status">
            {currentMood ? `${currentMood.emoji} ${currentMood.label}` : '● Online'}
          </span>
        </div>
        <button className="btn-icon" onClick={onEditNickname} title="Edit nickname">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button className="btn-icon danger" onClick={onLogout} title="Logout">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>

        {/* Mood Picker Dropdown */}
        {showMoodPicker && (
          <div className="status-dropdown" onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '8px 14px 12px',
              borderBottom: '1px solid var(--border)'
            }}>
              Set your mood
            </div>
            {MOODS.map(mood => (
              <div
                key={mood.emoji}
                className="status-option"
                onClick={() => {
                  setCurrentMood(currentMood?.emoji === mood.emoji ? null : mood);
                  setShowMoodPicker(false);
                }}
                style={{
                  background: currentMood?.emoji === mood.emoji ? 'var(--primary-glow)' : 'transparent'
                }}
              >
                <span style={{ fontSize: '20px' }}>{mood.emoji}</span>
                <span className="status-text">{mood.label}</span>
                {currentMood?.emoji === mood.emoji && (
                  <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>
                )}
              </div>
            ))}
            {currentMood && (
              <div
                className="status-option"
                onClick={() => {
                  setCurrentMood(null);
                  setShowMoodPicker(false);
                }}
                style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '12px' }}
              >
                <span style={{ fontSize: '16px', opacity: 0.7 }}>✕</span>
                <span className="status-text" style={{ opacity: 0.7 }}>Clear mood</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
