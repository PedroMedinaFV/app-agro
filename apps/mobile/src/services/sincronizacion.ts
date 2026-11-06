import type { SesionUsuario } from '@agro/tipos';
import { clienteApi } from './clienteApi';
import { obtenerColaSesion } from './almacenamientoLocal';
import { sincronizarCola, type ConfirmacionSincronizacion } from './offline/sincronizador';
import { crearUrlSubidaAdjuntoObservacion, subirArchivoAFirmaSupabase } from './api';

export async function sincronizarPendientes(sesion: SesionUsuario, estaActiva: () => boolean) {
  const cola = await obtenerColaSesion(sesion);
  const comprobarSesion = () => {
    if (!estaActiva()) throw new Error('La sesion cambio. Los pendientes se conservaron para su usuario.');
  };
  return sincronizarCola(cola, {
    estaActiva,
    subirAdjunto: async (adjunto) => {
      comprobarSesion();
      const firma = await crearUrlSubidaAdjuntoObservacion({
        nombreArchivo: adjunto.nombreArchivo, mimeType: adjunto.mimeType, tamanioBytes: adjunto.tamanioBytes,
      }, sesion.token);
      comprobarSesion();
      await subirArchivoAFirmaSupabase(firma.signedUploadUrl, adjunto.uri, adjunto.mimeType);
      return {
        storageBucket: firma.storageBucket, storagePath: firma.storagePath,
        nombreArchivo: adjunto.nombreArchivo, mimeType: adjunto.mimeType,
        tamanioBytes: adjunto.tamanioBytes, estado: 'disponible',
      };
    },
    enviar: async (registro) => {
      comprobarSesion();
      return clienteApi.post<ConfirmacionSincronizacion>('/sincronizacion', { registros: [registro] }, sesion.token);
    },
  });
}
