import { startBackendActivity } from '../utils/backendActivity';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type CachedGet<T> = {
  token?: string;
  respuesta?: T;
  promesa?: Promise<T>;
};

export async function request<T>(ruta: string, options: RequestInit = {}, token?: string): Promise<T> {
  const method = options.method || 'GET';
  const finishBackendActivity = startBackendActivity(getBackendActivityLabel(ruta, method));

  try {
    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const contenido = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error((contenido as { error?: string; detalle?: string }).detalle || (contenido as { error?: string }).error || 'La solicitud fallo');
    }

    return contenido as T;
  } finally {
    finishBackendActivity();
  }
}

export function obtenerConCache<T>(
  cache: CachedGet<T>,
  ruta: string,
  token?: string,
  opciones: { forzar?: boolean } = {},
) {
  if (!opciones.forzar && cache.respuesta && cache.token === token) {
    return Promise.resolve(cache.respuesta);
  }

  if (!opciones.forzar && cache.promesa && cache.token === token) {
    return cache.promesa;
  }

  const promesa = request<T>(ruta, {}, token)
    .then((respuesta) => {
      cache.respuesta = respuesta;
      cache.token = token;
      return respuesta;
    })
    .finally(() => {
      if (cache.promesa === promesa) {
        cache.promesa = undefined;
      }
    });

  cache.token = token;
  cache.promesa = promesa;

  return promesa;
}

export function invalidarCache<T>(cache: CachedGet<T>) {
  cache.respuesta = undefined;
  cache.promesa = undefined;
}

function getBackendActivityLabel(ruta: string, method: string) {
  const metodo = method.toUpperCase();

  if (ruta.startsWith('/auth/')) {
    return 'Iniciando sesion...';
  }

  if (ruta.includes('/sincronizar')) {
    return 'Sincronizando padrones...';
  }

  if (ruta.includes('/cerrar')) {
    return 'Cerrando planificacion...';
  }

  if (metodo === 'GET') {
    return 'Cargando datos...';
  }

  if (metodo === 'DELETE') {
    return 'Eliminando registro...';
  }

  return 'Guardando cambios...';
}
