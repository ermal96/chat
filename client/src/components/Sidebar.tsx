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
        <h2>Teams Chat</h2>
        <button className="btn-icon" onClick={onNewRoom} title="New chat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
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
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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
        <button className="btn-icon" onClick={onEditNickname} title="Edit profile">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
        <button className="btn-icon" onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
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
