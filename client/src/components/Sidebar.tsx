import { useState } from 'react';
import type { Room, Team, Channel } from '../../../shared/types';
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
  // Team props
  teams: Map<string, Team>;
  currentTeam: Team | null;
  currentChannel: Channel | null;
  onSelectTeam: (team: Team) => void;
  onSelectChannel: (channel: Channel) => void;
  onNewTeam: () => void;
  onNewChannel: () => void;
  onLeaveTeam: (teamId: string) => void;
}

export function Sidebar({
  rooms,
  currentRoom,
  user,
  onSelectRoom,
  onNewRoom,
  onLogout,
  showMobile,
  onCloseMobile,
  teams,
  currentTeam,
  currentChannel,
  onSelectTeam,
  onSelectChannel,
  onNewTeam,
  onNewChannel,
  onLeaveTeam
}: SidebarProps) {
  const avatarColor = getAvatarColor(user.id);
  const [activeTab, setActiveTab] = useState<'teams' | 'chats'>('teams');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleTeamSelect = (team: Team) => {
    onSelectTeam(team);
    // Auto-expand the team
    setExpandedTeams(prev => new Set(prev).add(team.id));
  };

  return (
    <aside className={`sidebar ${showMobile ? 'show-mobile' : ''}`}>
      <div className="sidebar-header">
        <h2>Cunat Teams</h2>
      </div>

      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
          </svg>
          Teams
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          Chats
        </button>
      </div>

      {/* Teams List */}
      {activeTab === 'teams' && (
        <div className="teams-section">
          <div className="section-header">
            <span>Your teams</span>
            <button className="btn-icon small" onClick={onNewTeam} title="Create or Join Team">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>

          <ul className="team-list">
            {Array.from(teams.values()).map(team => (
              <li key={team.id} className="team-item-wrapper">
                <div
                  className={`team-item ${currentTeam?.id === team.id ? 'active' : ''}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <button
                    className="expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTeamExpanded(team.id);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="currentColor"
                      style={{ transform: expandedTeams.has(team.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                  <div className="team-avatar" style={{ backgroundColor: getAvatarColor(team.id) }}>
                    {getInitials(team.name)}
                  </div>
                  <div className="team-name">{team.name}</div>
                </div>

                {/* Channels */}
                {expandedTeams.has(team.id) && (
                  <ul className="channel-list">
                    {team.channels.map(channel => (
                      <li
                        key={channel.id}
                        className={`channel-item ${currentChannel?.id === channel.id ? 'active' : ''}`}
                        onClick={() => onSelectChannel(channel)}
                      >
                        <span className="channel-hash">#</span>
                        <span className="channel-name">{channel.name}</span>
                      </li>
                    ))}
                    {currentTeam?.id === team.id && (
                      <li className="channel-item add-channel" onClick={onNewChannel}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        <span>Add channel</span>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}

            {teams.size === 0 && (
              <li className="no-items">
                <p>No teams yet</p>
                <button className="btn small" onClick={onNewTeam}>Create or Join</button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Chats List */}
      {activeTab === 'chats' && (
        <div className="chats-section">
          <div className="section-header">
            <span>Recent chats</span>
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
      )}

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
