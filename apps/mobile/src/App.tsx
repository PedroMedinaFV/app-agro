import { useSesionMobile } from './hooks/useSesionMobile';
import { PantallaLogin } from './screens/PantallaLogin';
import { PantallaOperativa } from './screens/PantallaOperativa';

export default function App() {
  const auth = useSesionMobile();
  if (!auth.sesion) {
    return (
      <PantallaLogin
        email={auth.email}
        password={auth.password}
        setEmail={auth.setEmail}
        setPassword={auth.setPassword}
        iniciarSesion={auth.iniciarSesion}
      />
    );
  }
  // Desmontar todo el estado operativo cuando cambia la sesion, sin usar el token como key.
  return (
    <PantallaOperativa
      key={auth.version}
      sesion={auth.sesion}
      sesionActual={auth.sesionActual}
      onCerrarSesion={() => auth.cambiarSesion(null)}
    />
  );
}
