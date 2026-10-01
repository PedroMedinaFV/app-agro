import type { ObservacionCampo, SeveridadObservacion } from '@agro/tipos';

export type FormularioObservacion = {
  campoAppId: string;
  loteAppId: string;
  recorridaId: string;
  titulo: string;
  descripcion: string;
  severidad: SeveridadObservacion;
  latitud: string;
  longitud: string;
  fechaEvento: string;
};

export function fechaActualInputObservacion() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());

  return ahora.toISOString().slice(0, 16);
}

export function crearFormularioObservacionInicial(campoAppId = ''): FormularioObservacion {
  return {
    campoAppId,
    loteAppId: '',
    recorridaId: '',
    titulo: '',
    descripcion: '',
    severidad: 'media',
    latitud: '',
    longitud: '',
    fechaEvento: fechaActualInputObservacion(),
  };
}

export function describirCoordenadasObservacion(observacion: ObservacionCampo) {
  if (observacion.latitud === undefined || observacion.longitud === undefined) {
    return 'Sin ubicacion';
  }

  return `${observacion.latitud.toFixed(5)}, ${observacion.longitud.toFixed(5)}`;
}

export function obtenerSeveridadMaximaObservacion(actual: ObservacionCampo['severidad'] | undefined, nueva: ObservacionCampo['severidad']) {
  if (actual === 'alta' || nueva === 'alta') return 'alta';
  if (actual === 'media' || nueva === 'media') return 'media';

  return 'baja';
}
