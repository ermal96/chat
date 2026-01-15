import { useState } from 'react';

interface WelcomeScreenProps {
  onRegister: (email: string, password: string, nickname: string) => void;
  onLogin: (email: string, password: string) => void;
  savedEmail?: string;
}

type AuthMode = 'main' | 'login' | 'register';

export function WelcomeScreen({
  onRegister,
  onLogin,
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

  if (mode === 'login') {
    return (
      <div className="welcome-screen">
        <div className="welcome-container">
          <button className="back-btn" onClick={() => setMode('main')}>← Back</button>
          <div className="welcome-logo">🔥</div>
          <h1>Welcome Back!</h1>
          <p className="tagline">Ready to share some memes?</p>

          <div className="auth-form">
            <input
              type="email"
              placeholder="📧 Email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="🔒 Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
            <button className="btn primary large" onClick={handleLogin}>
              🚀 Login
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
          <div className="welcome-logo">✨</div>
          <h1>Join the Party!</h1>
          <p className="tagline">Create your account to start memeing</p>

          <div className="auth-form">
            <input
              type="text"
              placeholder="😎 Nickname"
              value={registerNickname}
              onChange={e => setRegisterNickname(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
            />
            <input
              type="email"
              placeholder="📧 Email"
              value={registerEmail}
              onChange={e => setRegisterEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="🔒 Password (min 6 characters)"
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              autoComplete="new-password"
            />
            <button className="btn primary large" onClick={handleRegister}>
              🎉 Create Account
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

  // Main menu
  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-logo">🔥</div>
        <h1>Meme Chat</h1>
        <p className="tagline">The ultimate place for memes, GIFs & fun conversations</p>

        <div className="auth-buttons">
          <button className="btn primary large" onClick={() => setMode('login')}>
            🚀 Login
          </button>
          <button className="btn outline large" onClick={() => setMode('register')}>
            ✨ Create Account
          </button>
        </div>

        <p className="info-text">
          🎭 Share memes • 📸 Send GIFs • 💬 Chat with friends
          <br />
          <span style={{ opacity: 0.7, fontSize: '12px' }}>Messages auto-delete for privacy</span>
        </p>
      </div>
    </div>
  );
}
