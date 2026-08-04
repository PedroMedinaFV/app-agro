const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function request<T>(ruta: string, method: string, cuerpo?: unknown): Promise<T> {
  const respuesta = await fetch(`${BASE_URL}${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error((datos as { error?: string }).error || 'La solicitud falló');
  }

  return datos as T;
}

export const clienteApi = {
  post: <T>(ruta: string, cuerpo?: unknown) => request<T>(ruta, 'POST', cuerpo),
};
