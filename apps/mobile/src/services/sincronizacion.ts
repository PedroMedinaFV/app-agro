import { clienteApi } from './clienteApi';
import {
  leerRegistrosLocales,
  marcarRegistroSincronizado,
} from './almacenamientoLocal';

type RespuestaSincronizacion = {
  mensaje?: string;
  resultado?: {
    sincronizados: number;
    pendientes: number;
    registros: Array<{
      id: string;
      sincronizado: boolean;
      error?: string;
    }>;
  };
};

export async function sincronizarPendientes(token: string) {
  const pendientes = (await leerRegistrosLocales()).filter((registro) => !registro.sincronizado);

  if (!pendientes.length) {
    return { ok: true, sincronizados: 0, restantes: 0 };
  }

  try {
    const respuesta = await clienteApi.post<RespuestaSincronizacion>(
      '/sincronizacion',
      {
        registros: pendientes.map(({ id, tipo, payload }) => ({
          id,
          tipo,
          payload,
          sincronizado: false,
        })),
      },
      token,
    );
    const registrosProcesados = respuesta.resultado?.registros || [];
    const registrosSincronizados = registrosProcesados.filter((registro) => registro.sincronizado);

    for (const registro of registrosSincronizados) {
      await marcarRegistroSincronizado(registro.id);
    }

    return {
      ok: (respuesta.resultado?.pendientes || 0) === 0,
      sincronizados: registrosSincronizados.length,
      restantes: respuesta.resultado?.pendientes || pendientes.length - registrosSincronizados.length,
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
