import { clienteApi } from './clienteApi';
import {
  AdjuntoLocalPendiente,
  leerRegistrosLocales,
  marcarRegistroSincronizado,
} from './almacenamientoLocal';
import { crearUrlSubidaAdjuntoObservacion, subirArchivoAFirmaSupabase } from './api';

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

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

async function subirAdjuntoLocal(adjunto: AdjuntoLocalPendiente, token: string) {
  const firma = await crearUrlSubidaAdjuntoObservacion({
    nombreArchivo: adjunto.nombreArchivo,
    mimeType: adjunto.mimeType,
    tamanioBytes: adjunto.tamanioBytes,
  }, token);

  await subirArchivoAFirmaSupabase(firma.signedUploadUrl, adjunto.uri, adjunto.mimeType);

  return {
    storageBucket: firma.storageBucket,
    storagePath: firma.storagePath,
    nombreArchivo: adjunto.nombreArchivo,
    mimeType: adjunto.mimeType,
    tamanioBytes: adjunto.tamanioBytes,
    estado: 'disponible' as const,
  };
}

async function prepararRegistroParaSincronizar(registro: Awaited<ReturnType<typeof leerRegistrosLocales>>[number], token: string) {
  if (registro.tipo !== 'observacion' || !registro.adjuntosLocales?.length || !esObjeto(registro.payload)) {
    return registro;
  }

  const adjuntos = [];
  for (const adjunto of registro.adjuntosLocales) {
    adjuntos.push(await subirAdjuntoLocal(adjunto, token));
  }

  return {
    ...registro,
    payload: {
      ...registro.payload,
      adjuntos,
    },
  };
}

export async function sincronizarPendientes(token: string) {
  const pendientes = (await leerRegistrosLocales()).filter((registro) => !registro.sincronizado);

  if (!pendientes.length) {
    return { ok: true, sincronizados: 0, restantes: 0 };
  }

  try {
    const registrosPreparados = [];
    for (const registro of pendientes) {
      registrosPreparados.push(await prepararRegistroParaSincronizar(registro, token));
    }

    const respuesta = await clienteApi.post<RespuestaSincronizacion>(
      '/sincronizacion',
      {
        registros: registrosPreparados.map(({ id, tipo, payload }) => ({
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
