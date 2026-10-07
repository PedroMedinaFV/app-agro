import type {
  DestinoApp,
  DestinoVentaLineaSnapshot,
  GastosComercialesLineaSnapshot,
  GastosComercialesReferencia,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PrecioReferencia,
  PrecioVentaLineaSnapshot,
  ProtocoloLineaSnapshot,
  ProtocoloProductivoDetalle,
} from '@agro/tipos';

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

export type SupuestosLineaPlanificacionCongelada = Pick<
  PlanificacionAgricolaLinea,
  | 'empresaErpId'
  | 'campoAppId'
  | 'campoErpId'
  | 'loteAppId'
  | 'loteErpId'
  | 'actividadAppId'
  | 'actividadErpId'
  | 'cultivoErpId'
  | 'destinoReferenciaId'
  | 'destinoVenta'
  | 'destinoVentaManual'
  | 'destinoVentaSnapshot'
  | 'precioReferenciaId'
  | 'precioVentaEstimado'
  | 'precioVentaManual'
  | 'precioVentaSnapshot'
  | 'hectareasPlanificadas'
  | 'rindeEstimado'
  | 'gastosComercialesReferenciaId'
  | 'gastosComercialesEstimados'
  | 'gastosComercialesSnapshot'
  | 'protocoloId'
  | 'protocoloSnapshot'
  | 'ingresoBrutoEstimado'
  | 'ingresoNetoEstimado'
  | 'costoProduccionEstimado'
  | 'margenBrutoEstimado'
  | 'margenBrutoActualizado'
>;

export function extraerSupuestosCongeladosLinea(linea: PlanificacionAgricolaLinea): SupuestosLineaPlanificacionCongelada {
  return {
    empresaErpId: linea.empresaErpId,
    campoAppId: linea.campoAppId,
    campoErpId: linea.campoErpId,
    loteAppId: linea.loteAppId,
    loteErpId: linea.loteErpId,
    actividadAppId: linea.actividadAppId,
    actividadErpId: linea.actividadErpId,
    cultivoErpId: linea.cultivoErpId,
    destinoReferenciaId: linea.destinoReferenciaId,
    destinoVenta: linea.destinoVenta,
    destinoVentaManual: linea.destinoVentaManual,
    destinoVentaSnapshot: linea.destinoVentaSnapshot,
    precioReferenciaId: linea.precioReferenciaId,
    precioVentaEstimado: linea.precioVentaEstimado,
    precioVentaManual: linea.precioVentaManual,
    precioVentaSnapshot: linea.precioVentaSnapshot,
    hectareasPlanificadas: linea.hectareasPlanificadas,
    rindeEstimado: linea.rindeEstimado,
    gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
    gastosComercialesEstimados: linea.gastosComercialesEstimados,
    gastosComercialesSnapshot: linea.gastosComercialesSnapshot,
    protocoloId: linea.protocoloId,
    protocoloSnapshot: linea.protocoloSnapshot,
    ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
    ingresoNetoEstimado: linea.ingresoNetoEstimado,
    costoProduccionEstimado: linea.costoProduccionEstimado,
    margenBrutoEstimado: linea.margenBrutoEstimado,
    margenBrutoActualizado: linea.margenBrutoActualizado,
  };
}

export function crearSnapshotDestinoVentaLinea(
  linea: PlanificacionAgricolaLinea,
  destinosPorId: Map<string, DestinoApp> = new Map(),
): DestinoVentaLineaSnapshot {
  const destino = linea.destinoReferenciaId ? destinosPorId.get(linea.destinoReferenciaId) : undefined;

  if (!destino && (!linea.destinoReferenciaId || linea.destinoVentaManual)) {
    return {
      origen: 'manual',
      destinoVenta: linea.destinoVenta,
    };
  }

  if (!destino) {
    return {
      origen: 'referencia',
      referenciaId: linea.destinoReferenciaId,
      destinoVenta: linea.destinoVenta,
    };
  }

  return {
    origen: 'referencia',
    referenciaId: destino.id,
    destinoVenta: destino.destinoVenta,
    descripcion: destino.descripcion,
    empresaErpId: destino.empresaErpId,
    actividadAppId: destino.actividadAppId,
    actividadErpId: destino.actividadErpId,
    cultivoErpId: destino.cultivoErpId,
  };
}

export function crearSnapshotPrecioVentaLinea(
  linea: PlanificacionAgricolaLinea,
  preciosPorId: Map<string, PrecioReferencia> = new Map(),
): PrecioVentaLineaSnapshot {
  const precio = linea.precioReferenciaId ? preciosPorId.get(linea.precioReferenciaId) : undefined;

  if (!precio && (!linea.precioReferenciaId || linea.precioVentaManual)) {
    return {
      origen: 'manual',
      valor: linea.precioVentaEstimado,
    };
  }

  if (!precio) {
    return {
      origen: 'referencia',
      referenciaId: linea.precioReferenciaId,
      valor: linea.precioVentaEstimado,
    };
  }

  return {
    origen: 'referencia',
    referenciaId: precio.id,
    destinoVenta: precio.destinoVenta,
    valor: precio.valor,
    moneda: precio.moneda,
    unidad: precio.unidad,
    fuente: precio.fuente,
    observaciones: precio.observaciones,
  };
}

export function crearSnapshotGastosComercialesLinea(
  linea: PlanificacionAgricolaLinea,
  gastosComercialesPorId: Map<string, GastosComercialesReferencia> = new Map(),
): GastosComercialesLineaSnapshot {
  const referencia = linea.gastosComercialesReferenciaId
    ? gastosComercialesPorId.get(linea.gastosComercialesReferenciaId)
    : undefined;

  if (!referencia && !linea.gastosComercialesReferenciaId) {
    return {
      origen: 'manual',
      items: [],
      totalEstimado: linea.gastosComercialesEstimados,
    };
  }

  if (!referencia) {
    return {
      origen: 'referencia',
      referenciaId: linea.gastosComercialesReferenciaId,
      items: [],
      totalEstimado: linea.gastosComercialesEstimados,
    };
  }

  return {
    origen: 'referencia',
    referenciaId: referencia.id,
    descripcion: referencia.descripcion,
    items: referencia.items.map((item) => ({
      conceptoGastoComercialId: item.conceptoGastoComercialId,
      conceptoNombre: item.conceptoNombre,
      valorPorTonelada: item.valorPorTonelada,
      unidadCalculo: item.unidadCalculo,
      moneda: item.moneda,
      observaciones: item.observaciones,
    })),
    totalEstimado: linea.gastosComercialesEstimados,
  };
}

export function crearSnapshotProtocoloLinea(
  linea: PlanificacionAgricolaLinea,
  protocolosPorId: Map<string, ProtocoloProductivoDetalle> = new Map(),
): ProtocoloLineaSnapshot {
  const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
  const costoEstimadoPorHa = linea.hectareasPlanificadas > 0
    ? linea.costoProduccionEstimado / linea.hectareasPlanificadas
    : 0;

  if (!protocolo && !linea.protocoloId) {
    return {
      origen: 'manual',
      costoEstimadoPorHa,
      costoTotalEstimado: linea.costoProduccionEstimado,
      etapas: [],
    };
  }

  if (!protocolo) {
    return {
      origen: 'referencia',
      protocoloId: linea.protocoloId,
      costoEstimadoPorHa,
      costoTotalEstimado: linea.costoProduccionEstimado,
      etapas: [],
    };
  }

  return {
    origen: 'referencia',
    protocoloId: protocolo.id,
    nombre: protocolo.nombre,
    descripcion: protocolo.descripcion,
    costoEstimadoPorHa: protocolo.costoEstimadoPorHa,
    costoTotalEstimado: linea.costoProduccionEstimado,
    etapas: protocolo.etapas.map((etapa) => ({
      ...etapa,
      labores: etapa.labores.map((labor) => ({ ...labor })),
      insumos: etapa.insumos.map((insumo) => ({ ...insumo })),
    })),
  };
}

export function congelarLineaPlanificacionParaCierre(
  linea: PlanificacionAgricolaLinea,
  gastosComercialesPorId: Map<string, GastosComercialesReferencia> = new Map(),
  protocolosPorId: Map<string, ProtocoloProductivoDetalle> = new Map(),
  opciones: {
    destinosPorId?: Map<string, DestinoApp>;
    preciosPorId?: Map<string, PrecioReferencia>;
  } = {},
): PlanificacionAgricolaLinea {
  return {
    ...recalcularLineaPlanificacionPersistida(linea),
    destinoVentaSnapshot: crearSnapshotDestinoVentaLinea(linea, opciones.destinosPorId),
    precioVentaSnapshot: crearSnapshotPrecioVentaLinea(linea, opciones.preciosPorId),
    gastosComercialesSnapshot: crearSnapshotGastosComercialesLinea(linea, gastosComercialesPorId),
    protocoloSnapshot: crearSnapshotProtocoloLinea(linea, protocolosPorId),
    estado: 'cerrada',
  };
}

export function congelarPlanificacionParaCierre(
  planificacion: PlanificacionAgricola,
  gastosComercialesPorId: Map<string, GastosComercialesReferencia> = new Map(),
  protocolosPorId: Map<string, ProtocoloProductivoDetalle> = new Map(),
  opciones: {
    destinosPorId?: Map<string, DestinoApp>;
    preciosPorId?: Map<string, PrecioReferencia>;
  } = {},
): PlanificacionAgricola {
  return {
    ...planificacion,
    estado: 'cerrada',
    escenarioOriginal: true,
    escenarioBloqueadoPorId: undefined,
    lineas: planificacion.lineas.map((linea) => congelarLineaPlanificacionParaCierre(linea, gastosComercialesPorId, protocolosPorId, opciones)),
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
