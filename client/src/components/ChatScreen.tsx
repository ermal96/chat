import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InviteModal } from './InviteModal';
import { NewRoomModal } from './NewRoomModal';
import type { Room, Message } from '../../../shared/types';
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
  onKickUser: (roomId: string, userId: string) => void;
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  onChangeNickname: (newNickname: string) => void;
  onLogout: () => void;
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
  onKickUser,
  onCreateRoom,
  onJoinRoom,
  onChangeNickname,
  onLogout
}: ChatScreenProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [newNickname, setNewNickname] = useState(user.nickname);

  const isOwner = currentRoom?.ownerId === user.id;

  const handleKickMember = (memberId: string, memberName: string) => {
    if (confirm(`Kick ${memberName} from the room?`)) {
      onKickUser(currentRoom!.id, memberId);
    }
  };

  const handleSaveNickname = () => {
    if (newNickname.trim() && newNickname.trim() !== user.nickname) {
      onChangeNickname(newNickname.trim());
    }
    setShowEditNickname(false);
  };

  const handleLeaveRoom = () => {
    if (currentRoom && confirm(`Leave "${currentRoom.name}"?`)) {
      onLeaveRoom(currentRoom.id);
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
          onEditNickname={() => {
            setNewNickname(user.nickname);
            setShowEditNickname(true);
          }}
          onLogout={onLogout}
          showMobile={showMobileMenu}
          onCloseMobile={() => setShowMobileMenu(false)}
        />

        <main className="chat-main">
          {!currentRoom ? (
            <div className="no-room">
              <div className="no-room-icon">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--primary)">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
              </div>
              <h3>Welcome to Teams Chat</h3>
              <p>Select a conversation from the sidebar or start a new chat with your team</p>
              <div className="welcome-actions">
                <button className="btn primary" onClick={() => setShowNewRoomModal(true)}>
                  New chat
                </button>
                <button className="btn secondary" onClick={() => setShowNewRoomModal(true)}>
                  Join with code
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-area">
              <header className="chat-header">
                <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(true)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                </button>

                <div className="room-info">
                  <div
                    className="room-avatar"
                    style={{ background: `linear-gradient(135deg, ${getAvatarColor(currentRoom.id)}, #5558a3)` }}
                  >
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
                  <button className="btn-icon" onClick={() => setShowMembersPanel(true)} title="View members">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon" onClick={() => setShowInviteModal(true)} title="Add people">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </button>
                  <button className="btn-icon" onClick={handleLeaveRoom} title="Leave conversation">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              </header>

              <MessageList
                messages={messages}
                currentUserId={user.id}
                currentUserNickname={user.nickname}
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
                members={currentRoom?.members}
                currentUserId={user.id}
              />
            </div>
          )}
        </main>
      </div>

      {showInviteModal && currentRoom && (
        <InviteModal
          inviteCode={currentRoom.inviteCode}
          onClose={() => setShowInviteModal(false)}
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

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div className="mobile-overlay" onClick={() => setShowMobileMenu(false)} />
      )}

      {/* Edit Nickname Modal */}
      {showEditNickname && (
        <div className="modal-overlay" onClick={() => setShowEditNickname(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Nickname</h3>
              <button className="close-btn" onClick={() => setShowEditNickname(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                placeholder="Enter new nickname"
                maxLength={30}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveNickname();
                  if (e.key === 'Escape') setShowEditNickname(false);
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setShowEditNickname(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSaveNickname}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Members Panel Modal */}
      {showMembersPanel && currentRoom && (
        <div className="modal-overlay" onClick={() => setShowMembersPanel(false)}>
          <div className="modal members-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>People ({currentRoom.members?.length || 0})</h3>
              <button className="btn-icon small" onClick={() => setShowMembersPanel(false)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body members-list">
              {currentRoom.members?.map(member => (
                <div key={member.id} className="member-item">
                  <div
                    className="member-avatar"
                    style={{ background: `linear-gradient(135deg, ${getAvatarColor(member.id)}, #5558a3)` }}
                  >
                    {getInitials(member.nickname)}
                  </div>
                  <div className="member-info">
                    <span className="member-name">
                      {member.nickname}
                      {member.id === currentRoom.ownerId && (
                        <span className="owner-badge">Owner</span>
                      )}
                      {member.id === user.id && (
                        <span className="you-badge">You</span>
                      )}
                    </span>
                    <span className={`member-status ${member.isOnline ? 'online' : ''}`}>
                      {member.isOnline ? 'Available' : 'Offline'}
                    </span>
                  </div>
                  {isOwner && member.id !== user.id && (
                    <button
                      className="kick-btn"
                      onClick={() => handleKickMember(member.id, member.nickname)}
                      title="Remove from conversation"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {(!currentRoom.members || currentRoom.members.length === 0) && (
                <div className="no-members">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--text-muted)" style={{ opacity: 0.5 }}>
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  <p>No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
