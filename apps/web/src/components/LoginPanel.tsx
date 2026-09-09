import { LoadingSpinner } from './LoadingSpinner';

interface LoginPanelProps {
  error: string;
  cargando: boolean;
  onMicrosoftLogin: () => void;
  onDemoLogin: () => void;
}

export function LoginPanel({
  error,
  cargando,
  onMicrosoftLogin,
  onDemoLogin,
}: LoginPanelProps) {
  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Bienvenido</p>
        <h1>Agro App</h1>
        <p className="intro">Ingresa con Microsoft. El rol y los campos disponibles se toman desde la configuracion del administrador.</p>

        {error && <div className="status-error">{error}</div>}

        <button className="primary" onClick={onMicrosoftLogin} disabled={cargando}>
          <span className="button-content">
            {cargando && <LoadingSpinner label="Ingresando" />}
            {cargando ? 'Ingresando...' : 'Continuar con Microsoft'}
          </span>
        </button>

        <button className="secondary full-width" onClick={onDemoLogin} disabled={cargando}>
          Entrar demo admin
        </button>

        <p className="hint">
          Acceso demo reservado para desarrollo local. En uso real, el usuario debe estar creado previamente por un administrador.
        </p>
      </div>
    </div>
  );
}
