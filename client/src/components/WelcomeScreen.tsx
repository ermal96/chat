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
          <p>Register to start chatting</p>

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
        </div>

        <p className="info-text">
          Messages auto-delete after 2 minutes
        </p>
      </div>
    </div>
  );
}
