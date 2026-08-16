interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Cargando' }: LoadingSpinnerProps) {
  return <span className="loading-spinner" aria-label={label} />;
}
