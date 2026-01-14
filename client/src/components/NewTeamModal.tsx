import { useState } from 'react';

interface NewTeamModalProps {
  onCreateTeam: (name: string, description?: string) => void;
  onJoinTeam: (inviteCode: string) => void;
  onClose: () => void;
}

export function NewTeamModal({ onCreateTeam, onJoinTeam, onClose }: NewTeamModalProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateTeam(name.trim(), description.trim() || undefined);
      onClose();
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      onJoinTeam(inviteCode.trim());
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Teams</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Team
          </button>
          <button
            className={`modal-tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Team
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="team-name">Team Name</label>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Marketing Team"
                maxLength={50}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="team-description">Description (optional)</label>
              <input
                id="team-description"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this team about?"
                maxLength={200}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={!name.trim()}>
                Create Team
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label htmlFor="team-invite-code">Invite Code</label>
              <input
                id="team-invite-code"
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter team code"
                maxLength={10}
                autoFocus
              />
            </div>
            <p className="help-text">
              Ask a team member for the invite code to join their team.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={!inviteCode.trim()}>
                Join Team
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
