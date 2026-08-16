import type { RolUsuario } from '@agro/tipos';
import { LoadingSpinner } from './LoadingSpinner';

interface LoginPanelProps {
  email: string;
  onEmailChange: (email: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  rol: RolUsuario;
  onRolChange: (rol: RolUsuario) => void;
  error: string;
  cargando: boolean;
  onLogin: () => void;
}

export function LoginPanel({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  rol,
  onRolChange,
  error,
  cargando,
  onLogin,
}: LoginPanelProps) {
  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Bienvenido</p>
        <h1>Agro App</h1>
        <p className="intro">Ingresa con una cuenta demo para explorar la plataforma.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={cargando}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            disabled={cargando}
          />
        </label>

        <label>
          Rol
          <select value={rol} onChange={(event) => onRolChange(event.target.value as RolUsuario)} disabled={cargando}>
            <option value="admin">Admin</option>
            <option value="usuario">Usuario</option>
          </select>
        </label>

        {error && <div className="status-error">{error}</div>}

        <button className="primary" onClick={onLogin} disabled={cargando}>
          <span className="button-content">
            {cargando && <LoadingSpinner label="Ingresando" />}
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </span>
        </button>

        <p className="hint">
          Demo local: Los datos se almacenan en el navegador. Ideal para validar flujos antes de integrar backend.
        </p>
      </div>
    </div>
  );
}
