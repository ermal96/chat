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
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = () => {
    if (!roomName.trim()) return;
    onCreateRoom(nickname, roomName.trim(), 'group');
    onClose();
  };

  const handleJoin = () => {
    if (!inviteCode.trim()) return;
    onJoinRoom(nickname, inviteCode.trim().toUpperCase());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>New Room</h3>
        <p className="subtitle">Create a new room or join an existing one</p>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Room
          </button>
          <button
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join Room
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="tab-content">
            <div className="input-group">
              <label>Room Name</label>
              <input
                type="text"
                placeholder="Enter room name"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={30}
                autoFocus
              />
            </div>
            <div className="btn-group">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={handleCreate} disabled={!roomName.trim()}>
                Create Room
              </button>
            </div>
          </div>
        ) : (
          <div className="tab-content">
            <div className="input-group">
              <label>Invite Code</label>
              <input
                type="text"
                placeholder="Enter 6-character code"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={6}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 600 }}
              />
            </div>
            <div className="btn-group">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn secondary" onClick={handleJoin} disabled={!inviteCode.trim()}>
                Join Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
