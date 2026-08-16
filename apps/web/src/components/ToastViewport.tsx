import { Toast } from '../hooks/useToast';

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <article className={`toast toast-${toast.tipo}`} key={toast.id}>
          <div>
            <strong>{toast.titulo}</strong>
            {toast.mensaje && <p>{toast.mensaje}</p>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Cerrar notificacion">
            x
          </button>
        </article>
      ))}
    </div>
  );
}
