import type { ConsolidadoPlanificacion, PlanificacionAgricola } from './planificacion';

/** Solo documentos aprobados; cada linea mantiene su planificacionId y sus snapshots originales. */
export function consolidarPlanificacion(original: PlanificacionAgricola, documentos: PlanificacionAgricola[]): ConsolidadoPlanificacion {
  const anexos = documentos.filter((p) => p.tipoDocumento === 'anexo' && p.estado === 'cerrada'
    && p.planificacionOriginalId === original.id && p.clienteId === original.clienteId && p.campaniaErpId === original.campaniaErpId);
  const lineas = [original, ...anexos].flatMap((p) => p.lineas);
  const superficie = new Map<string, number>();
  for (const linea of lineas) superficie.set(linea.loteAppId, Math.max(superficie.get(linea.loteAppId) ?? 0, linea.hectareasPlanificadas));
  const hectareasCultivo = lineas.reduce((n, l) => n + l.hectareasPlanificadas, 0);
  const margen = lineas.reduce((n, l) => n + l.margenBrutoEstimado, 0);
  return { original, anexos, lineas, totales: {
    superficieFisica: [...superficie.values()].reduce((n, ha) => n + ha, 0), hectareasCultivo,
    ingresoNeto: lineas.reduce((n, l) => n + l.ingresoNetoEstimado, 0),
    costo: lineas.reduce((n, l) => n + l.costoProduccionEstimado, 0), margen,
    margenPorHa: hectareasCultivo ? margen / hectareasCultivo : 0,
  } };
}
