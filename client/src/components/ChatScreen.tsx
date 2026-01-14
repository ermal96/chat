import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InviteModal } from './InviteModal';
import { NewRoomModal } from './NewRoomModal';
import { NewTeamModal } from './NewTeamModal';
import { NewChannelModal } from './NewChannelModal';
import type { Room, Message, Team, Channel } from '../../../shared/types';
import { getAvatarColor, getInitials } from '../../../shared/types';

interface TypingUser {
  id: string;
  nickname: string;
}

interface ChatScreenProps {
  user: { id: string; nickname: string };
  rooms: Map<string, Room>;
  currentRoom: Room | null;
  messages: Message[];
  typingUsers: TypingUser[];
  replyingTo: Message | null;
  onSelectRoom: (room: Room) => void;
  onSendMessage: (content: string, imageUrl?: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onReply: (message: Message) => void;
  onCancelReply: () => void;
  onLeaveRoom: (roomId: string) => void;
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  onLogout: () => void;
  // Team props
  teams: Map<string, Team>;
  currentTeam: Team | null;
  currentChannel: Channel | null;
  onSelectTeam: (team: Team) => void;
  onSelectChannel: (channel: Channel) => void;
  onCreateTeam: (name: string, description?: string) => void;
  onJoinTeam: (inviteCode: string) => void;
  onLeaveTeam: (teamId: string) => void;
  onCreateChannel: (teamId: string, name: string, description?: string) => void;
  onDeleteChannel: (teamId: string, channelId: string) => void;
}

export function ChatScreen({
  user,
  rooms,
  currentRoom,
  messages,
  typingUsers,
  replyingTo,
  onSelectRoom,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onTypingStart,
  onTypingStop,
  onReply,
  onCancelReply,
  onLeaveRoom,
  onCreateRoom,
  onJoinRoom,
  onLogout,
  // Team props
  teams,
  currentTeam,
  currentChannel,
  onSelectTeam,
  onSelectChannel,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onCreateChannel,
  onDeleteChannel
}: ChatScreenProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamInviteModal, setShowTeamInviteModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLeaveRoom = () => {
    if (currentRoom && confirm(`Leave "${currentRoom.name}"?`)) {
      onLeaveRoom(currentRoom.id);
    }
  };

  const handleLeaveTeam = () => {
    if (currentTeam && confirm(`Leave "${currentTeam.name}"?`)) {
      onLeaveTeam(currentTeam.id);
    }
  };

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(u => u.id !== user.id);

  const getTypingText = () => {
    if (otherTypingUsers.length === 0) return null;
    if (otherTypingUsers.length === 1) return `${otherTypingUsers[0].nickname} is typing`;
    if (otherTypingUsers.length === 2) return `${otherTypingUsers[0].nickname} and ${otherTypingUsers[1].nickname} are typing`;
    return `${otherTypingUsers.length} people are typing`;
  };

  // Determine if we're viewing a room or channel
  const isViewingChannel = currentChannel !== null;
  const isViewingRoom = currentRoom !== null && !isViewingChannel;
  const hasActiveChat = isViewingChannel || isViewingRoom;

  return (
    <div className="chat-screen">
      <div className="chat-layout">
        <Sidebar
          rooms={rooms}
          currentRoom={currentRoom}
          user={user}
          onSelectRoom={(room) => {
            onSelectRoom(room);
            setShowMobileMenu(false);
          }}
          onNewRoom={() => setShowNewRoomModal(true)}
          onLogout={onLogout}
          showMobile={showMobileMenu}
          onCloseMobile={() => setShowMobileMenu(false)}
          // Team props
          teams={teams}
          currentTeam={currentTeam}
          currentChannel={currentChannel}
          onSelectTeam={(team) => {
            onSelectTeam(team);
            setShowMobileMenu(false);
          }}
          onSelectChannel={(channel) => {
            onSelectChannel(channel);
            setShowMobileMenu(false);
          }}
          onNewTeam={() => setShowNewTeamModal(true)}
          onNewChannel={() => setShowNewChannelModal(true)}
          onLeaveTeam={onLeaveTeam}
        />

        <main className="chat-main">
          {!hasActiveChat ? (
            <div className="no-room">
              <div className="no-room-icon">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.5 }}>
                  <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
                </svg>
              </div>
              <h3>Welcome to Cunat Teams</h3>
              <p>Select a team channel or chat from the sidebar to start messaging</p>
              <div className="welcome-actions">
                <button className="btn primary" onClick={() => setShowNewTeamModal(true)}>
                  Create or Join Team
                </button>
                <button className="btn secondary" onClick={() => setShowNewRoomModal(true)}>
                  Start a Chat
                </button>
              </div>
            </div>
          ) : isViewingChannel && currentChannel && currentTeam ? (
            <div className="chat-area">
              <header className="chat-header">
                <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(true)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                </button>

                <div className="room-info">
                  <div className="channel-indicator">
                    <span className="channel-hash-large">#</span>
                  </div>
                  <div className="room-details">
                    <h3>{currentChannel.name}</h3>
                    <span className="member-count">
                      {currentTeam.name} · {currentTeam.memberCount} member{currentTeam.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="room-actions">
                  <button className="btn-icon" onClick={() => setShowTeamInviteModal(true)} title="Invite to Team">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </button>
                  <button className="btn-icon danger" onClick={handleLeaveTeam} title="Leave Team">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              </header>

              <MessageList
                messages={messages}
                currentUserId={user.id}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                onReply={onReply}
              />

              {/* Typing indicator */}
              {otherTypingUsers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">{getTypingText()}</span>
                </div>
              )}

              <MessageInput
                onSend={onSendMessage}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
                replyingTo={replyingTo}
                onCancelReply={onCancelReply}
              />
            </div>
          ) : currentRoom ? (
            <div className="chat-area">
              <header className="chat-header">
                <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(true)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                </button>

                <div className="room-info">
                  <div className="room-avatar" style={{ backgroundColor: getAvatarColor(currentRoom.id) }}>
                    {getInitials(currentRoom.name)}
                  </div>
                  <div className="room-details">
                    <h3>{currentRoom.name}</h3>
                    <span className="member-count">
                      {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) !== 1 ? 's' : ''}
                      {currentRoom.onlineMembers && currentRoom.onlineMembers.length > 0 && (
                        <span className="online-count"> · {currentRoom.onlineMembers.length} online</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="room-actions">
                  <button className="btn-icon" onClick={() => setShowInviteModal(true)} title="Invite">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </button>
                  <button className="btn-icon danger" onClick={handleLeaveRoom} title="Leave Room">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              </header>

              <MessageList
                messages={messages}
                currentUserId={user.id}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                onReply={onReply}
              />

              {/* Typing indicator */}
              {otherTypingUsers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">{getTypingText()}</span>
                </div>
              )}

              <MessageInput
                onSend={onSendMessage}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
                replyingTo={replyingTo}
                onCancelReply={onCancelReply}
              />
            </div>
          ) : null}
        </main>
      </div>

      {showInviteModal && currentRoom && (
        <InviteModal
          inviteCode={currentRoom.inviteCode}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showTeamInviteModal && currentTeam && (
        <InviteModal
          inviteCode={currentTeam.inviteCode}
          onClose={() => setShowTeamInviteModal(false)}
        />
      )}

      {showNewRoomModal && (
        <NewRoomModal
          nickname={user.nickname}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
          onClose={() => setShowNewRoomModal(false)}
        />
      )}

      {showNewTeamModal && (
        <NewTeamModal
          onCreateTeam={onCreateTeam}
          onJoinTeam={onJoinTeam}
          onClose={() => setShowNewTeamModal(false)}
        />
      )}

      {showNewChannelModal && currentTeam && (
        <NewChannelModal
          teamId={currentTeam.id}
          onCreateChannel={onCreateChannel}
          onClose={() => setShowNewChannelModal(false)}
        />
      )}

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div className="mobile-overlay" onClick={() => setShowMobileMenu(false)} />
      )}
    </div>
  );
}
