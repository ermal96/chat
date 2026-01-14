import { useState } from 'react';

interface NewRoomModalProps {
  nickname: string;
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  onClose: () => void;
}

export function NewRoomModal({ nickname, onCreateRoom, onJoinRoom, onClose }: NewRoomModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'group' | 'direct'>('group');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = () => {
    if (!roomName.trim()) return;
    onCreateRoom(nickname, roomName.trim(), roomType);
    onClose();
  };

  const handleJoin = () => {
    if (!inviteCode.trim()) return;
    onJoinRoom(nickname, inviteCode.trim().toUpperCase());
    onClose();
  };

  return (
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h3>Create or Join Room</h3>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create
          </button>
          <button
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="tab-content">
            <input
              type="text"
              placeholder="Room name"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              maxLength={30}
            />
            <select value={roomType} onChange={e => setRoomType(e.target.value as 'group' | 'direct')}>
              <option value="group">Group Chat</option>
              <option value="direct">Direct Message</option>
            </select>
            <button className="btn primary" onClick={handleCreate}>Create</button>
          </div>
        ) : (
          <div className="tab-content">
            <input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button className="btn secondary" onClick={handleJoin}>Join</button>
          </div>
        )}

        <button className="btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
