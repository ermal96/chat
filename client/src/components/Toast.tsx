interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div className={`toast ${type}`}>
      {message}
    </div>
  );
}
