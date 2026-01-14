import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InviteModal } from './InviteModal';
import { NewRoomModal } from './NewRoomModal';
import type { Room, Message } from '../../../shared/types';

interface ChatScreenProps {
  user: { id: string; nickname: string };
  rooms: Map<string, Room>;
  currentRoom: Room | null;
  messages: Message[];
  onSelectRoom: (room: Room) => void;
  onSendMessage: (content: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  onLogout: () => void;
}

export function ChatScreen({
  user,
  rooms,
  currentRoom,
  messages,
  onSelectRoom,
  onSendMessage,
  onLeaveRoom,
  onCreateRoom,
  onJoinRoom,
  onLogout
}: ChatScreenProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);

  const handleLeave = () => {
    if (currentRoom && confirm(`Leave "${currentRoom.name}"?`)) {
      onLeaveRoom(currentRoom.id);
    }
  };

  return (
    <div className="chat-screen">
      <div className="chat-layout">
        <Sidebar
          rooms={rooms}
          currentRoom={currentRoom}
          user={user}
          onSelectRoom={onSelectRoom}
          onNewRoom={() => setShowNewRoomModal(true)}
          onLogout={onLogout}
        />

        <main className="chat-main">
          {!currentRoom ? (
            <div className="no-room">
              <p>Select a room or create a new one to start chatting</p>
            </div>
          ) : (
            <div className="chat-area">
              <header className="chat-header">
                <div className="room-info">
                  <h3>{currentRoom.name}</h3>
                  <span className="member-count">
                    {currentRoom.memberCount} member{currentRoom.memberCount !== 1 ? 's' : ''} · {currentRoom.type === 'group' ? 'Group' : 'Direct'}
                  </span>
                </div>
                <div className="room-actions">
                  <button className="btn small" onClick={() => setShowInviteModal(true)}>
                    Invite
                  </button>
                  <button className="btn small danger" onClick={handleLeave}>
                    Leave
                  </button>
                </div>
              </header>

              <MessageList messages={messages} currentUserId={user.id} />
              <MessageInput onSend={onSendMessage} />
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
    </div>
  );
}
