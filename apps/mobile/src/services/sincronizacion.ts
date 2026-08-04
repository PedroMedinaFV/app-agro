import { clienteApi } from './clienteApi';
import {
  leerRegistrosLocales,
  marcarRegistroSincronizado,
  RegistroLocal,
} from './almacenamientoLocal';

export async function sincronizarPendientes() {
  const pendientes = await leerRegistrosLocales();

  if (!pendientes.length) {
    return { ok: true, sincronizados: 0, restantes: 0 };
  }

  try {
    const respuesta = await clienteApi.post<{ mensaje?: string }>('/sincronizacion', {
      registros: pendientes.map(({ id, tipo, payload }) => ({
        id,
        tipo,
        payload,
        sincronizado: false,
      })),
    });

    const sincronizados = pendientes.length;

    for (const pendiente of pendientes) {
      await marcarRegistroSincronizado(pendiente.id);
    }

    return {
      ok: true,
      sincronizados,
      restantes: 0,
      mensaje: respuesta.mensaje || 'Sincronización completada',
    };
  } catch (error: any) {
    return {
      ok: false,
      sincronizados: 0,
      restantes: pendientes.length,
      error: error?.message || 'No se pudo conectar con el backend',
    };
  }
}
