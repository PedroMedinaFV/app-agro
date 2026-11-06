import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { SesionUsuario } from '@agro/tipos';
import { loginUsuario } from '../services/api';

export function useSesionMobile() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const sesionActual = useRef<SesionUsuario | null>(null);
  const [version, setVersion] = useState(0);

  function cambiarSesion(nueva: SesionUsuario | null) {
    // Invalidar callbacks en vuelo antes del siguiente render/desmontaje.
    sesionActual.current = nueva;
    setVersion((anterior) => anterior + 1);
    setSesion(nueva);
  }
  async function iniciarSesion() {
    try {
      cambiarSesion(await loginUsuario(email.trim().toLowerCase(), password));
      setPassword('');
    } catch (error) {
      Alert.alert('Login', error instanceof Error ? error.message : 'No se pudo iniciar sesion.');
    }
  }

  return { sesion, sesionActual, version, email, setEmail, password, setPassword, cambiarSesion, iniciarSesion };
}
