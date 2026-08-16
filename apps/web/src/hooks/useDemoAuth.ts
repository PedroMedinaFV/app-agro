import { useState } from 'react';
import { obtenerPermisosRol, RolUsuario, SesionUsuario } from '@agro/tipos';
import { loginDemo } from '../services/api';

export function useDemoAuth() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('demo@agroapp.local');
  const [password, setPassword] = useState('demo1234');
  const [rol, setRol] = useState<RolUsuario>('admin');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrarModoDemo() {
    setCargando(true);
    setError('');

    try {
      setSesion(await loginDemo({ email, nombre: 'Usuario Demo', rol }));
    } catch (error) {
      // Fallback intencional: permite validar la UI aunque la API no este levantada.
      setError('API no disponible. Usando sesion demo local.');
      setSesion({
        token: 'demo-local-token',
        usuario: { id: 'demo-local', email, nombre: 'Usuario Demo', rol },
        origen: 'demo',
        permisos: obtenerPermisosRol(rol),
      });
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    setSesion(null);
  }

  return {
    sesion,
    email,
    setEmail,
    password,
    setPassword,
    rol,
    setRol,
    error,
    cargando,
    entrarModoDemo,
    cerrarSesion,
  };
}
