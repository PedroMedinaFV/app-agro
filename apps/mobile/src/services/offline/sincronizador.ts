import type { CrearAdjuntoObservacionInput } from '@agro/tipos';
import type { ColaOffline } from './cola';
import type { AdjuntoLocalPendiente, RegistroLocal } from './tipos';

export type ConfirmacionSincronizacion = { resultado?: { registros: Array<{ id: string; sincronizado: boolean; error?: string }> } };
type Dependencias = {
  estaActiva: () => boolean;
  subirAdjunto: (adjunto: AdjuntoLocalPendiente) => Promise<CrearAdjuntoObservacionInput>;
  enviar: (registro: Pick<RegistroLocal, 'id' | 'tipo' | 'payload'>) => Promise<ConfirmacionSincronizacion>;
};

export async function sincronizarCola(cola: ColaOffline, deps: Dependencias) {
  return cola.sincronizarExclusivamente(async () => {
    let sincronizados = 0;
    const errores: string[] = [];
    const verificarSesion = () => {
      if (!deps.estaActiva()) throw new Error('La sesion cambio. Los pendientes se conservaron para su usuario.');
    };
    const pendientes = (await cola.listar()).filter((registro) => !registro.sincronizado);
    for (const registro of pendientes) {
      try {
        verificarSesion();
        const adjuntos = [];
        for (let indice = 0; indice < (registro.adjuntosLocales?.length || 0); indice += 1) {
          const adjunto = registro.adjuntosLocales![indice];
          verificarSesion();
          const subido = adjunto.subido || await deps.subirAdjunto(adjunto);
          // Confirmar progreso en disco antes de continuar con otro adjunto o el registro.
          if (!adjunto.subido) await cola.guardarAdjuntoSubido(registro.id, indice, subido);
          adjuntos.push(subido);
        }
        verificarSesion();
        const payload = adjuntos.length ? { ...registro.payload, adjuntos } : registro.payload;
        const respuesta = await deps.enviar({ id: registro.id, tipo: registro.tipo, payload });
        const confirmaciones = respuesta.resultado?.registros;
        const confirmacion = Array.isArray(confirmaciones) ? confirmaciones.find((item) => item.id === registro.id) : undefined;
        if (confirmacion?.sincronizado !== true) throw new Error(confirmacion?.error || 'El servidor no confirmo el registro.');
        // Una respuesta en vuelo puede confirmar A despues del logout: solo se actualiza la cola capturada de A.
        await cola.marcarSincronizado(registro.id);
        sincronizados += 1;
      } catch (error) {
        errores.push(error instanceof Error ? error.message : 'No se pudo sincronizar el registro.');
        if (!deps.estaActiva()) break;
      }
    }
    const restantes = (await cola.listar()).filter((registro) => !registro.sincronizado).length;
    return { ok: restantes === 0 && errores.length === 0, sincronizados, restantes, error: errores[0] };
  });
}
