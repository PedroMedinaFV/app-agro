import { LoadingSpinner } from './LoadingSpinner';

interface BlockingLoaderProps {
  visible: boolean;
  label?: string;
}

export function BlockingLoader({ visible, label = 'Procesando...' }: BlockingLoaderProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="blocking-loader" role="alert" aria-live="assertive" aria-busy="true">
      <section className="blocking-loader-card" aria-label={label}>
        <LoadingSpinner label={label} />
        <strong>{label}</strong>
      </section>
    </div>
  );
}
