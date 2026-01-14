import type { Room } from '../../../shared/types';
import { getAvatarColor, getInitials } from '../../../shared/types';

interface SidebarProps {
  rooms: Map<string, Room>;
  currentRoom: Room | null;
  user: { id: string; nickname: string };
  onSelectRoom: (room: Room) => void;
  onNewRoom: () => void;
  onLogout: () => void;
  showMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  rooms,
  currentRoom,
  user,
  onSelectRoom,
  onNewRoom,
  onLogout,
  showMobile
}: SidebarProps) {
  const avatarColor = getAvatarColor(user.id);

  return (
    <aside className={`sidebar ${showMobile ? 'show-mobile' : ''}`}>
      <div className="sidebar-header">
        <h2>Cunat Chat</h2>
      </div>

      <div className="chats-section">
        <div className="section-header">
          <span>Chats</span>
          <button className="btn-icon small" onClick={onNewRoom} title="New Chat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </div>

        <ul className="room-list">
          {Array.from(rooms.values()).map(room => (
            <li
              key={room.id}
              className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => onSelectRoom(room)}
            >
              <div className="room-avatar" style={{ backgroundColor: getAvatarColor(room.id) }}>
                {getInitials(room.name)}
              </div>
              <div className="room-content">
                <div className="room-name">{room.name}</div>
                <div className="room-meta">
                  {room.memberCount || 1} member{(room.memberCount || 1) !== 1 ? 's' : ''}
                </div>
              </div>
              {room.unreadCount && room.unreadCount > 0 && (
                <div className="unread-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</div>
              )}
            </li>
          ))}

          {rooms.size === 0 && (
            <li className="no-items">
              <p>No chats yet</p>
              <button className="btn small" onClick={onNewRoom}>Start a chat</button>
            </li>
          )}
        </ul>
      </div>

      <div className="user-section">
        <div className="user-avatar" style={{ backgroundColor: avatarColor }}>
          {getInitials(user.nickname)}
        </div>
        <div className="user-info">
          <span className="user-name">{user.nickname}</span>
          <span className="user-status">Online</span>
        </div>
        <button className="btn-icon logout" onClick={onLogout} title="Logout">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
