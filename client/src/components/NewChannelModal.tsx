import { useState } from 'react';

interface NewChannelModalProps {
  teamId: string;
  onCreateChannel: (teamId: string, name: string, description?: string) => void;
  onClose: () => void;
}

export function NewChannelModal({ teamId, onCreateChannel, onClose }: NewChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateChannel(teamId, name.trim().toLowerCase().replace(/\s+/g, '-'), description.trim() || undefined);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Create Channel</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="channel-name">Channel Name</label>
            <div className="input-with-prefix">
              <span className="input-prefix">#</span>
              <input
                id="channel-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., announcements"
                maxLength={50}
                autoFocus
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="channel-description">Description (optional)</label>
            <input
              id="channel-description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              maxLength={200}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
