import type { LoteMapaNdvi } from '@agro/tipos';
import { formatearFechaHora } from '../formatters';

export function describirFechaSeguimiento(valor: string | undefined) {
  return valor ? formatearFechaHora(valor) : 'Sin fecha';
}

export function formatearNdvi(valor: number | undefined) {
  if (valor === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function obtenerEstadoNdvi(mapa: LoteMapaNdvi | null) {
  if (!mapa) {
    return 'Sin NDVI';
  }

  if (mapa.estado !== 'procesado') {
    return mapa.estado;
  }

  const promedio = mapa.ndviPromedio;

  if (promedio === undefined) {
    return 'Procesado';
  }

  if (promedio < 0.35) {
    return 'Bajo';
  }

  if (promedio < 0.6) {
    return 'Medio';
  }

  return 'Alto';
}

export function dentroDelRangoSeguimiento(fechaIso: string, desde: string, hasta: string) {
  const fecha = new Date(fechaIso).getTime();
  const minimo = desde ? new Date(`${desde}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const maximo = hasta ? new Date(`${hasta}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return fecha >= minimo && fecha <= maximo;
}
