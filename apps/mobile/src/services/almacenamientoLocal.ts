import type { SesionUsuario } from '@agro/tipos';
import { crearColaOffline } from './offline/cola';
import type { AlmacenamientoOffline } from './offline/tipos';
export type { AdjuntoLocalPendiente, RegistroLocal, NuevoRegistroLocal, PropietarioOffline } from './offline/tipos';

const esReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
let almacenamiento: Promise<AlmacenamientoOffline> | undefined;

function obtenerAlmacenamiento() {
  if (!almacenamiento) {
    almacenamiento = (async () => {
      if (esReactNative) return (await import('@react-native-async-storage/async-storage')).default;
      if (typeof localStorage === 'undefined') throw new Error('No hay almacenamiento persistente disponible.');
      return {
        getItem: async (clave: string) => localStorage.getItem(clave),
        setItem: async (clave: string, valor: string) => { localStorage.setItem(clave, valor); },
      };
    })().catch((error) => { almacenamiento = undefined; throw error; });
  }
  return almacenamiento;
}

export async function obtenerColaSesion(sesion: SesionUsuario) {
  const propietario = { clienteId: sesion.usuario.clienteId || '', usuarioId: sesion.usuario.id };
  return crearColaOffline(await obtenerAlmacenamiento(), propietario);
}

export async function hayPendientesAnteriores() {
  const raw = await (await obtenerAlmacenamiento()).getItem('agro-app-registros-local');
  if (!raw) return false;
  try {
    const registros = JSON.parse(raw);
    return !Array.isArray(registros) || registros.some((registro) => registro?.sincronizado !== true);
  } catch { return true; }
}
