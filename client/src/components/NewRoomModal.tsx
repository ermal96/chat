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
        <div className="modal-header">
          <h3>New conversation</h3>
          <button className="btn-icon small" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            New chat
          </button>
          <button
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join with code
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="tab-content">
            <div className="input-group">
              <label>Chat name</label>
              <input
                type="text"
                placeholder="Enter a name for your chat"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={30}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={handleCreate} disabled={!roomName.trim()}>
                Create
              </button>
            </div>
          </div>
        ) : (
          <div className="tab-content">
            <div className="input-group">
              <label>Invite code</label>
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
            <div className="modal-footer">
              <button className="btn secondary" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={handleJoin} disabled={!inviteCode.trim()}>
                Join
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
