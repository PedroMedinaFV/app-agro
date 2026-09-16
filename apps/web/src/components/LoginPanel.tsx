import { useState } from 'react';
import { IconButton } from './IconButton';
import { LoadingSpinner } from './LoadingSpinner';

interface LoginPanelProps {
  error: string;
  cargando: boolean;
  onEmailLogin: (email: string, password: string) => void;
  onMicrosoftLogin: () => void;
  onDemoLogin: () => void;
}

export function LoginPanel({
  error,
  cargando,
  onEmailLogin,
  onMicrosoftLogin,
  onDemoLogin,
}: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <div className="login-shell">
      <div className="login-panel">
        <p className="eyebrow">Bienvenido</p>
        <h1>Agro App</h1>
        <p className="intro">Ingresa con tu usuario. El rol y los campos disponibles se toman desde la configuracion del administrador.</p>

        {error && <div className="status-error">{error}</div>}

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onEmailLogin(email, password);
          }}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="usuario@empresa.com"
              disabled={cargando}
            />
          </label>
          <label>
            Contrasena
            <span className="password-field">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={cargando}
              />
              <IconButton
                icon={mostrarPassword ? 'eye-off' : 'eye'}
                label={mostrarPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                onClick={() => setMostrarPassword((actual) => !actual)}
                disabled={cargando}
              />
            </span>
          </label>
          <button className="primary" type="submit" disabled={cargando}>
            <span className="button-content">
              {cargando && <LoadingSpinner label="Ingresando" />}
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </span>
          </button>
        </form>

        <div className="login-divider"><span>o</span></div>

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
