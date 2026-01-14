import { useState } from 'react';

interface WelcomeScreenProps {
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  savedNickname?: string;
}

export function WelcomeScreen({ onCreateRoom, onJoinRoom, savedNickname }: WelcomeScreenProps) {
  const [createNickname, setCreateNickname] = useState(savedNickname || '');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'group' | 'direct'>('group');
  const [joinNickname, setJoinNickname] = useState(savedNickname || '');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = () => {
    if (!createNickname.trim() || !roomName.trim()) return;
    onCreateRoom(createNickname.trim(), roomName.trim(), roomType);
  };

  const handleJoin = () => {
    if (!joinNickname.trim() || !inviteCode.trim()) return;
    onJoinRoom(joinNickname.trim(), inviteCode.trim().toUpperCase());
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <h1>Invite Chat</h1>
        <p>Chat with friends - no login required!</p>

        <div className="welcome-actions">
          <div className="action-card">
            <h3>Create a Room</h3>
            <input
              type="text"
              placeholder="Your nickname"
              value={createNickname}
              onChange={e => setCreateNickname(e.target.value)}
              maxLength={20}
            />
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
            <button className="btn primary" onClick={handleCreate}>
              Create Room
            </button>
          </div>

          <div className="divider">or</div>

          <div className="action-card">
            <h3>Join with Code</h3>
            <input
              type="text"
              placeholder="Your nickname"
              value={joinNickname}
              onChange={e => setJoinNickname(e.target.value)}
              maxLength={20}
            />
            <input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button className="btn secondary" onClick={handleJoin}>
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
