import { useState } from 'react';

interface InviteModalProps {
  inviteCode: string;
  onClose: () => void;
}

export function InviteModal({ inviteCode, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add people</h3>
          <button className="btn-icon small" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Share this code with others to let them join the conversation.
          </p>
          <div className="invite-code-display">
            <span>{inviteCode}</span>
            <button className="btn small primary" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
