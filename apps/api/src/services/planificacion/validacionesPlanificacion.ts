import type { PlanificacionAgricola, PlanificacionAgricolaLinea } from '@agro/tipos';

export type LoteSuperficieValidacion = {
  id: string;
  nombre: string;
  superficieTotal: number;
};

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function recalcularLineaPlanificacionPersistida(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
  const ingresoBrutoEstimado = linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado;
  const ingresoNetoEstimado = ingresoBrutoEstimado - linea.gastosComercialesEstimados;

  return {
    ...linea,
    ingresoBrutoEstimado,
    ingresoNetoEstimado,
    margenBrutoEstimado: ingresoNetoEstimado - linea.costoProduccionEstimado,
    margenBrutoActualizado: linea.margenBrutoActualizado ?? ingresoNetoEstimado - linea.costoProduccionEstimado,
  };
}

export function validarCabeceraPlanificacion(planificacion: PlanificacionAgricola) {
  if (!planificacion.clienteId) {
    throw crearErrorValidacion('La planificacion debe tener clienteId.');
  }

  if (!planificacion.campaniaErpId) {
    throw crearErrorValidacion('La planificacion debe tener campaniaErpId.');
  }

  if (planificacion.estado === 'cerrada' || planificacion.estado === 'deshabilitada') {
    throw crearErrorValidacion('El cierre o deshabilitacion debe ejecutarse por el endpoint especifico de cierre.');
  }
}

export function validarLineasPlanificacion(
  planificacion: PlanificacionAgricola,
  opciones: { permitirHectareasCero: boolean; lotesPorId: Map<string, LoteSuperficieValidacion> },
) {
  const claves = new Set<string>();

  for (const linea of planificacion.lineas) {
    if (!linea.campoAppId || !linea.loteAppId || !linea.actividadAppId) {
      throw crearErrorValidacion('Cada linea debe tener campo, lote y actividad de planificacion.');
    }

    if (!Number.isFinite(linea.hectareasPlanificadas) || linea.hectareasPlanificadas < 0) {
      throw crearErrorValidacion('Las hectareas planificadas deben ser mayores o iguales a cero.');
    }

    const lote = opciones.lotesPorId.get(linea.loteAppId);
    if (!lote) {
      throw crearErrorValidacion('Cada linea debe referenciar un lote valido del cliente.');
    }

    if (Number.isFinite(lote.superficieTotal) && lote.superficieTotal >= 0 && linea.hectareasPlanificadas > lote.superficieTotal) {
      throw crearErrorValidacion(`Las hectareas planificadas del lote ${lote.nombre} no pueden superar su superficie total (${lote.superficieTotal} ha).`);
    }

    if (!opciones.permitirHectareasCero && linea.hectareasPlanificadas === 0) {
      throw crearErrorValidacion('Las hectareas planificadas deben ser mayores a cero para cerrar la planificacion.');
    }

    if (
      !Number.isFinite(linea.rindeEstimado)
      || !Number.isFinite(linea.precioVentaEstimado)
      || !Number.isFinite(linea.gastosComercialesEstimados)
      || !Number.isFinite(linea.costoProduccionEstimado)
      || linea.rindeEstimado < 0
      || linea.precioVentaEstimado < 0
      || linea.gastosComercialesEstimados < 0
      || linea.costoProduccionEstimado < 0
    ) {
      throw crearErrorValidacion('Rinde, precio, gastos y costos no pueden ser negativos.');
    }

    const clave = [
      planificacion.campaniaErpId,
      linea.campoAppId,
      linea.loteAppId,
      linea.actividadAppId,
    ].join('|');

    if (claves.has(clave)) {
      throw crearErrorValidacion('No se puede repetir la misma actividad para una misma campania, campo y lote.');
    }

    claves.add(clave);
  }
}

export function validarPlanificacionConLotes(
  planificacion: PlanificacionAgricola,
  opciones: { permitirHectareasCero: boolean; lotesPorId: Map<string, LoteSuperficieValidacion> },
) {
  validarCabeceraPlanificacion(planificacion);
  validarLineasPlanificacion(planificacion, opciones);
}

export function validarPlanificacionTieneLineasParaCierre(planificacion: PlanificacionAgricola) {
  if (planificacion.lineas.length === 0) {
    throw crearErrorValidacion('La planificacion debe tener al menos una linea para poder cerrarse.');
  }
}
