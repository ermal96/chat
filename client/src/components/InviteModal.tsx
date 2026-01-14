interface InviteModalProps {
  inviteCode: string;
  onClose: () => void;
}

export function InviteModal({ inviteCode, onClose }: InviteModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  return (
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h3>Invite Friends</h3>
        <p>Share this code with your friends:</p>
        <div className="invite-code-display">
          <span>{inviteCode}</span>
          <button className="btn small" onClick={handleCopy}>Copy</button>
        </div>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
