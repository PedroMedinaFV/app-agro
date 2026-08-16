import { useCallback, useState } from 'react';

export type ToastTipo = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  tipo: ToastTipo;
  titulo: string;
  mensaje?: string;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((actuales) => [...actuales, { ...toast, id }]);
    window.setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  return {
    toasts,
    notify,
    dismissToast,
  };
}
