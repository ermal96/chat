import { useState } from 'react';

interface WelcomeScreenProps {
  onCreateRoom: (nickname: string, roomName: string, roomType: 'group' | 'direct') => void;
  onJoinRoom: (nickname: string, inviteCode: string) => void;
  onRegister: (email: string, password: string, nickname: string) => void;
  onLogin: (email: string, password: string) => void;
  savedNickname?: string;
  savedEmail?: string;
}

type AuthMode = 'main' | 'login' | 'register' | 'guest';

export function WelcomeScreen({
  onCreateRoom,
  onJoinRoom,
  onRegister,
  onLogin,
  savedNickname,
  savedEmail
}: WelcomeScreenProps) {
  const [mode, setMode] = useState<AuthMode>('main');

  // Login form
  const [loginEmail, setLoginEmail] = useState(savedEmail || '');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');

  // Guest/Create room form
  const [createNickname, setCreateNickname] = useState(savedNickname || '');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'group' | 'direct'>('group');
  const [joinNickname, setJoinNickname] = useState(savedNickname || '');
  const [inviteCode, setInviteCode] = useState('');

  const handleLogin = () => {
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    onLogin(loginEmail.trim(), loginPassword.trim());
  };

  const handleRegister = () => {
    if (!registerEmail.trim() || !registerPassword.trim() || !registerNickname.trim()) return;
    if (registerPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    onRegister(registerEmail.trim(), registerPassword.trim(), registerNickname.trim());
  };

  const handleCreate = () => {
    if (!createNickname.trim() || !roomName.trim()) return;
    onCreateRoom(createNickname.trim(), roomName.trim(), roomType);
  };

  const handleJoin = () => {
    if (!joinNickname.trim() || !inviteCode.trim()) return;
    onJoinRoom(joinNickname.trim(), inviteCode.trim().toUpperCase());
  };

  if (mode === 'login') {
    return (
      <div className="welcome-screen">
        <div className="welcome-container">
          <button className="back-btn" onClick={() => setMode('main')}>← Back</button>
          <h1>Welcome Back</h1>
          <p>Login to access your rooms</p>

          <div className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
            <button className="btn primary" onClick={handleLogin}>
              Login
            </button>
          </div>

          <p className="switch-mode">
            Don't have an account?{' '}
            <button className="link-btn" onClick={() => setMode('register')}>
              Register
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div className="welcome-screen">
        <div className="welcome-container">
          <button className="back-btn" onClick={() => setMode('main')}>← Back</button>
          <h1>Create Account</h1>
          <p>Register to keep your rooms across sessions</p>

          <div className="auth-form">
            <input
              type="text"
              placeholder="Nickname"
              value={registerNickname}
              onChange={e => setRegisterNickname(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={e => setRegisterEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              autoComplete="new-password"
            />
            <button className="btn primary" onClick={handleRegister}>
              Create Account
            </button>
          </div>

          <p className="switch-mode">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => setMode('login')}>
              Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'guest') {
    return (
      <div className="welcome-screen">
        <div className="welcome-container">
          <button className="back-btn" onClick={() => setMode('main')}>← Back</button>
          <h1>Quick Start</h1>
          <p>Create or join a room without an account</p>

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

  // Main menu
  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <h1>Invite Chat</h1>
        <p>Secure messaging with your friends</p>

        <div className="auth-buttons">
          <button className="btn primary large" onClick={() => setMode('login')}>
            Login
          </button>
          <button className="btn secondary large" onClick={() => setMode('register')}>
            Create Account
          </button>
          <div className="divider">or</div>
          <button className="btn outline large" onClick={() => setMode('guest')}>
            Continue as Guest
          </button>
        </div>

        <p className="info-text">
          Messages auto-delete after 2 minutes
        </p>
      </div>
    </div>
  );
}
