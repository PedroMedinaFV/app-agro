export type BackendActivityState = {
  active: boolean;
  label: string;
};

type BackendActivityListener = (state: BackendActivityState) => void;

const DEFAULT_LABEL = 'Procesando...';
const listeners = new Set<BackendActivityListener>();
const activeLabels: string[] = [];

function emitBackendActivity() {
  const label = activeLabels[activeLabels.length - 1] || DEFAULT_LABEL;
  const state: BackendActivityState = {
    active: activeLabels.length > 0,
    label,
  };

  listeners.forEach((listener) => listener(state));
}

/**
 * Registra una llamada al backend y devuelve una funcion para finalizarla.
 * Mantiene un contador interno para que requests en paralelo no oculten el bloqueo antes de tiempo.
 */
export function startBackendActivity(label = DEFAULT_LABEL) {
  activeLabels.push(label);
  emitBackendActivity();

  let finished = false;

  return () => {
    if (finished) {
      return;
    }

    finished = true;
    activeLabels.pop();
    emitBackendActivity();
  };
}

export function subscribeBackendActivity(listener: BackendActivityListener) {
  listeners.add(listener);
  listener({
    active: activeLabels.length > 0,
    label: activeLabels[activeLabels.length - 1] || DEFAULT_LABEL,
  });

  return () => {
    listeners.delete(listener);
  };
}
