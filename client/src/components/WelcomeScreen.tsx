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
          <button className="back-btn" onClick={() => setMode('main')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back
          </button>
          <div className="welcome-logo">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--primary)">
              <path d="M16.5 12c1.38 0 2.49-1.12 2.49-2.5S17.88 7 16.5 7C15.12 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zM9 11c1.66 0 2.99-1.34 2.99-3S10.66 5 9 5C7.34 5 6 6.34 6 8s1.34 3 3 3zm7.5 3c-1.83 0-5.5.92-5.5 2.75V19h11v-2.25c0-1.83-3.67-2.75-5.5-2.75zM9 13c-2.33 0-7 1.17-7 3.5V19h7v-2.25c0-.85.33-2.34 2.37-3.47C10.5 13.1 9.66 13 9 13z"/>
            </svg>
          </div>
          <h1>Welcome back</h1>
          <p className="tagline">Sign in to continue to Teams Chat</p>

          <div className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>
            <button className="btn primary large" onClick={handleLogin}>
              Sign in
            </button>
          </div>

          <p className="switch-mode">
            Don't have an account?{' '}
            <button className="link-btn" onClick={() => setMode('register')}>
              Create one
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
          <button className="back-btn" onClick={() => setMode('main')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back
          </button>
          <div className="welcome-logo">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--primary)">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1>Create account</h1>
          <p className="tagline">Join Teams Chat to connect with your team</p>

          <div className="auth-form">
            <div className="input-group">
              <label>Display name</label>
              <input
                type="text"
                placeholder="How should we call you?"
                value={registerNickname}
                onChange={e => setRegisterNickname(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                autoComplete="new-password"
              />
            </div>
            <button className="btn primary large" onClick={handleRegister}>
              Create account
            </button>
          </div>

          <p className="switch-mode">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => setMode('login')}>
              Sign in
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
        <div className="welcome-logo">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--primary)">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </div>
        <h1>Teams Chat</h1>
        <p className="tagline">Connect and collaborate with your team</p>

        <div className="auth-buttons">
          <button className="btn primary large" onClick={() => setMode('login')}>
            Sign in
          </button>
          <button className="btn secondary large" onClick={() => setMode('register')}>
            Create account
          </button>
        </div>

        <p className="info-text">
          Chat with your team in real-time. Share files, images, and stay connected.
        </p>
      </div>
    </div>
  );
}
