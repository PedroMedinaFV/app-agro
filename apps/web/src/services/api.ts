import { ErpSnapshot, LoginDemoRequest, SesionUsuario } from '@agro/tipos';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(ruta: string, options: RequestInit = {}, token?: string): Promise<T> {
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
    throw new Error((contenido as { error?: string }).error || 'La solicitud fallo');
  }

  return contenido as T;
}

export async function loginDemo(datos: LoginDemoRequest): Promise<SesionUsuario> {
  return request<SesionUsuario>('/auth/demo', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerSnapshotErp(token?: string): Promise<ErpSnapshot> {
  return request<ErpSnapshot>('/erp/snapshot', {}, token);
}
