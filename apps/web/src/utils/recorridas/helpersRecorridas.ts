import type { ObjetivoRecorridaCampo } from '@agro/tipos';

export type FormularioRecorrida = {
  campoAppId: string;
  loteAppId: string;
  titulo: string;
  objetivo: ObjetivoRecorridaCampo;
  fechaInicio: string;
  observaciones: string;
};

export const objetivosRecorrida: { valor: ObjetivoRecorridaCampo; etiqueta: string }[] = [
  { valor: 'monitoreo_general', etiqueta: 'Monitoreo general' },
  { valor: 'plagas', etiqueta: 'Plagas' },
  { valor: 'malezas', etiqueta: 'Malezas' },
  { valor: 'enfermedades', etiqueta: 'Enfermedades' },
  { valor: 'emergencia', etiqueta: 'Emergencia' },
  { valor: 'cosecha', etiqueta: 'Cosecha' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export function fechaActualIso() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());

  return ahora.toISOString().slice(0, 10);
}

export function crearFormularioRecorridaInicial(campoAppId = ''): FormularioRecorrida {
  return {
    campoAppId,
    loteAppId: '',
    titulo: '',
    objetivo: 'monitoreo_general',
    fechaInicio: fechaActualIso(),
    observaciones: '',
  };
}

export function obtenerEtiquetaObjetivoRecorrida(objetivo: ObjetivoRecorridaCampo) {
  return objetivosRecorrida.find((item) => item.valor === objetivo)?.etiqueta || objetivo;
}
