import type {
  CrearObservacionRequest,
  CrearObservacionResponse,
  CrearPrecipitacionRequest,
  CrearPrecipitacionResponse,
  ObservacionesResponse,
  PlanificacionSnapshot,
  PrecipitacionesResponse,
} from '@agro/tipos';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

type PeticionOptions = RequestInit & {
  body?: BodyInit;
};

async function request<T>(ruta: string, options: PeticionOptions = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    ...options,
    headers,
  });

  const contenido = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error((contenido as { error?: string }).error || 'La solicitud falló');
  }

  return contenido as T;
}

export async function loginUsuario(email: string, password: string) {
  return request<{ token: string; usuario: { id: string; email: string; nombre?: string | null } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registrarUsuario(email: string, nombre: string, password: string) {
  return request<{ token: string; usuario: { id: string; email: string; nombre?: string | null } }>('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ email, nombre, password }),
  });
}

export async function loginMicrosoft(idToken: string) {
  return request<{ token: string; usuario: { id: string; email: string; nombre?: string | null } }>('/auth/microsoft', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function obtenerUsuarios(token: string) {
  const respuesta = await request<{ usuarios: Array<{ id: string; email: string; nombre?: string | null }> }>('/usuarios', {
    method: 'GET',
  }, token);

  return respuesta.usuarios;
}

export async function obtenerPrecipitaciones(token: string) {
  return request<PrecipitacionesResponse>('/precipitaciones', {
    method: 'GET',
  }, token);
}

export async function obtenerObservaciones(token: string) {
  return request<ObservacionesResponse>('/observaciones', {
    method: 'GET',
  }, token);
}

export async function obtenerPlanificacionSnapshot(token: string) {
  return request<PlanificacionSnapshot>('/planificacion/snapshot', {
    method: 'GET',
  }, token);
}

export async function crearPrecipitacion(datos: CrearPrecipitacionRequest, token: string) {
  return request<CrearPrecipitacionResponse>('/precipitaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function crearObservacion(datos: CrearObservacionRequest, token: string) {
  return request<CrearObservacionResponse>('/observaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}
