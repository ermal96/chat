import type { Room } from '../../../shared/types';

interface SidebarProps {
  rooms: Map<string, Room>;
  currentRoom: Room | null;
  user: { id: string; nickname: string };
  onSelectRoom: (room: Room) => void;
  onNewRoom: () => void;
  onLogout: () => void;
}

export function Sidebar({ rooms, currentRoom, user, onSelectRoom, onNewRoom, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Your Rooms</h2>
        <button className="btn small" onClick={onNewRoom}>+ New</button>
      </div>

      <ul className="room-list">
        {Array.from(rooms.values()).map(room => (
          <li
            key={room.id}
            className={currentRoom?.id === room.id ? 'active' : ''}
            onClick={() => onSelectRoom(room)}
          >
            <div className="room-name">{room.name}</div>
            <div className="room-type">
              {room.type === 'group' ? 'Group' : 'Direct'} · {room.memberCount} member{room.memberCount !== 1 ? 's' : ''}
            </div>
          </li>
        ))}
      </ul>

      <div className="user-info">
        <span>Logged in as: {user.nickname}</span>
        <button className="btn small logout" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
}
