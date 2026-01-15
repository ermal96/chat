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

const STATUSES = [
  { color: '#92c353', label: 'Available' },
  { color: '#ffaa44', label: 'Away' },
  { color: '#c4314b', label: 'Busy' },
  { color: '#c4314b', label: 'Do not disturb' },
  { color: '#b4b4b4', label: 'Appear offline' },
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
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{ color: string; label: string }>(STATUSES[0]);
  const avatarColor = getAvatarColor(user.id);

  // Filter rooms based on search query
  const filteredRooms = Array.from(rooms.values()).filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className={`sidebar ${showMobile ? 'show-mobile' : ''}`}>
      <div className="sidebar-header">
        <h2>
          Chat
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </h2>
        <div className="sidebar-header-actions">
          {/* Filter button */}
          <button className="btn-icon" title="Filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
          {/* New chat button */}
          <button className="btn-icon" onClick={onNewRoom} title="New chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar - Teams style */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn-icon small"
              onClick={() => setSearchQuery('')}
              style={{ width: '24px', height: '24px', padding: '0' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="chats-section">
        <div className="section-header">
          <span>Recent ({filteredRooms.length})</span>
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
                <div className="room-preview">
                  {room.memberCount || 1} members
                  {room.onlineCount && room.onlineCount > 0 && ` · ${room.onlineCount} online`}
                </div>
              </div>
              <div className="room-meta">
                {room.unreadCount && room.unreadCount > 0 && (
                  <span className="unread-badge">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </div>
            </li>
          ))}

          {filteredRooms.length === 0 && searchQuery && (
            <li className="no-items">
              <p>No results found</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Try a different search term</p>
            </li>
          )}

          {rooms.size === 0 && !searchQuery && (
            <li className="no-items">
              <p>Welcome to Teams Chat</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Start a conversation with your team
              </p>
              <button className="btn small primary" onClick={onNewRoom}>
                New chat
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="user-section" style={{ position: 'relative' }}>
        <div
          className="user-avatar"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, #5558a3)`, cursor: 'pointer' }}
          onClick={() => setShowStatusPicker(!showStatusPicker)}
          title="Set your status"
        >
          {getInitials(user.nickname)}
          <span className="status-dot" style={{ backgroundColor: currentStatus.color }}></span>
        </div>
        <div className="user-info">
          <span className="user-name" onClick={onEditNickname} style={{ cursor: 'pointer' }} title="Click to change nickname">
            {user.nickname}
          </span>
          <span className="user-status" style={{ color: currentStatus.color }}>
            {currentStatus.label}
          </span>
        </div>
        <button className="btn-icon" onClick={onEditNickname} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
        <button className="btn-icon" onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>

        {/* Status Picker Dropdown */}
        {showStatusPicker && (
          <div className="status-dropdown" onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '8px 14px 12px',
              borderBottom: '1px solid var(--border)'
            }}>
              Set status
            </div>
            {STATUSES.map(status => (
              <div
                key={status.label}
                className="status-option"
                onClick={() => {
                  setCurrentStatus(status);
                  setShowStatusPicker(false);
                }}
                style={{
                  background: currentStatus.label === status.label ? 'var(--bg-hover)' : 'transparent'
                }}
              >
                <span className="status-indicator" style={{ backgroundColor: status.color }}></span>
                <span className="status-text">{status.label}</span>
                {currentStatus.label === status.label && (
                  <svg style={{ marginLeft: 'auto' }} viewBox="0 0 24 24" width="16" height="16" fill="var(--primary)">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
