import type {
  GastosComercialesReferencia,
  LoteApp,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionAgricolaResumen,
  ProtocoloInsumo,
  ProtocoloLabor,
  ProtocoloProductivoDetalle,
  ProtocoloProductivoResumen,
} from './planificacion';

export function obtenerSuperficieInicialLote(lote: LoteApp) {
  const superficieTotal = Number.isFinite(lote.superficieTotal) && lote.superficieTotal > 0 ? lote.superficieTotal : 0;
  const superficieProductiva = Number.isFinite(lote.superficieProductiva) && lote.superficieProductiva > 0 ? lote.superficieProductiva : 0;

  if (superficieProductiva > 0) {
    return superficieTotal > 0 ? Math.min(superficieProductiva, superficieTotal) : superficieProductiva;
  }

  return superficieTotal;
}

export function obtenerClaveLinea(campaniaErpId: string | undefined, linea: PlanificacionAgricolaLinea) {
  return `${campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
}

export function obtenerClavesDuplicadas(lineas: PlanificacionAgricolaLinea[], campaniaErpId?: string) {
  const cantidades = new Map<string, number>();

  for (const linea of lineas) {
    const clave = obtenerClaveLinea(campaniaErpId, linea);
    cantidades.set(clave, (cantidades.get(clave) || 0) + 1);
  }

  return new Set(Array.from(cantidades.entries()).filter(([, cantidad]) => cantidad > 1).map(([clave]) => clave));
}

export function tieneLineasDuplicadasEnPlanificacion(planificacion: PlanificacionAgricola) {
  return obtenerClavesDuplicadas(planificacion.lineas, planificacion.campaniaErpId).size > 0;
}

export function lineaPlanificacionEstaCompleta(linea: PlanificacionAgricolaLinea) {
  return Boolean(linea.protocoloId && linea.destinoVenta && linea.hectareasPlanificadas > 0 && linea.rindeEstimado > 0 && linea.precioVentaEstimado > 0);
}

export function lineaPlanificacionTieneDatos(linea: PlanificacionAgricolaLinea) {
  return Boolean(
    linea.protocoloId
    || linea.destinoVenta
    || linea.rindeEstimado > 0
    || linea.precioVentaEstimado > 0
    || linea.gastosComercialesEstimados > 0
    || linea.costoProduccionEstimado > 0
    || linea.ingresoNetoEstimado !== 0
    || linea.margenBrutoEstimado !== 0
  );
}

export function limpiarSnapshotsLineaPlanificacion(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
  const {
    padronesSnapshot: _padronesSnapshot,
    destinoVentaSnapshot: _destinoVentaSnapshot,
    precioVentaSnapshot: _precioVentaSnapshot,
    gastosComercialesSnapshot: _gastosComercialesSnapshot,
    protocoloSnapshot: _protocoloSnapshot,
    ...lineaSinSnapshots
  } = linea;

  return lineaSinSnapshots;
}

export function calcularResumenPlanificacion(lineas: PlanificacionAgricolaLinea[]) {
  return lineas.reduce((total, linea) => ({
    margenBrutoTotal: total.margenBrutoTotal + linea.margenBrutoEstimado,
    ingresoNetoTotal: total.ingresoNetoTotal + linea.ingresoNetoEstimado,
    costoTotal: total.costoTotal + linea.costoProduccionEstimado,
    hectareasPlanificadas: total.hectareasPlanificadas + (linea.protocoloId ? linea.hectareasPlanificadas : 0),
  }), {
    margenBrutoTotal: 0,
    ingresoNetoTotal: 0,
    costoTotal: 0,
    hectareasPlanificadas: 0,
  });
}

export function calcularResumenGrupoPlanificacion(
  lineas: PlanificacionAgricolaLinea[],
  campaniaErpId: string | undefined,
  clavesDuplicadas: Set<string>,
) {
  return {
    hectareas: lineas.reduce((total, linea) => total + (linea.protocoloId ? linea.hectareasPlanificadas : 0), 0),
    margen: lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
    pendientes: lineas.filter((linea) => !lineaPlanificacionEstaCompleta(linea)).length,
    duplicadas: lineas.filter((linea) => clavesDuplicadas.has(obtenerClaveLinea(campaniaErpId, linea))).length,
  };
}

export function resumirPlanificacionLocal(planificacion: PlanificacionAgricola): PlanificacionAgricolaResumen {
  const resumen = calcularResumenPlanificacion(planificacion.lineas);

  return {
    id: planificacion.id,
    clienteId: planificacion.clienteId,
    campaniaErpId: planificacion.campaniaErpId,
    nombre: planificacion.nombre,
    descripcion: planificacion.descripcion,
    estado: planificacion.estado,
    escenarioOriginal: planificacion.escenarioOriginal,
    escenarioBloqueadoPorId: planificacion.escenarioBloqueadoPorId,
    cerradaPor: planificacion.cerradaPor,
    cerradaAt: planificacion.cerradaAt,
    motivoCierre: planificacion.motivoCierre,
    cantidadLineas: planificacion.lineas.length,
    hectareasPlanificadas: resumen.hectareasPlanificadas,
    ingresoNetoEstimado: resumen.ingresoNetoTotal,
    costoProduccionEstimado: resumen.costoTotal,
    margenBrutoEstimado: resumen.margenBrutoTotal,
    tieneLineasDuplicadas: tieneLineasDuplicadasEnPlanificacion(planificacion),
    createdAt: planificacion.createdAt,
    updatedAt: planificacion.updatedAt,
  };
}

export function calcularGastosComercialesLinea(
  linea: PlanificacionAgricolaLinea,
  referencia?: GastosComercialesReferencia,
) {
  if (!referencia) {
    return linea.gastosComercialesEstimados;
  }

  const produccionEstimadaTn = linea.hectareasPlanificadas * linea.rindeEstimado;

  return referencia.items.reduce((total, item) => {
    const baseCalculo = item.unidadCalculo === 'Ha' ? linea.hectareasPlanificadas : produccionEstimadaTn;

    return total + item.valorPorTonelada * baseCalculo;
  }, 0);
}

export function recalcularLineaPlanificacion(
  linea: PlanificacionAgricolaLinea,
  dependencias: {
    protocolosPorId: Map<string, ProtocoloProductivoResumen>;
    gastosComercialesReferenciaPorId: Map<string, GastosComercialesReferencia>;
  },
): PlanificacionAgricolaLinea {
  const gastosComercialesEstimados = linea.gastosComercialesReferenciaId
    ? calcularGastosComercialesLinea(linea, dependencias.gastosComercialesReferenciaPorId.get(linea.gastosComercialesReferenciaId))
    : linea.gastosComercialesEstimados;
  const protocolo = linea.protocoloId ? dependencias.protocolosPorId.get(linea.protocoloId) : undefined;
  const ingresoBrutoEstimado = linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado;
  const ingresoNetoEstimado = ingresoBrutoEstimado - gastosComercialesEstimados;
  const costoProduccionEstimado = linea.hectareasPlanificadas * (protocolo?.costoEstimadoPorHa || 0);
  const margenBruto = ingresoNetoEstimado - costoProduccionEstimado;

  return {
    ...linea,
    gastosComercialesEstimados,
    ingresoBrutoEstimado,
    ingresoNetoEstimado,
    costoProduccionEstimado,
    margenBrutoEstimado: margenBruto,
    margenBrutoActualizado: margenBruto,
  };
}

export function calcularCostoLaborProtocolo(labor: Pick<ProtocoloLabor, 'cantidadPorHa' | 'costoUnitario' | 'indiceAplicacion'>) {
  return labor.cantidadPorHa * labor.costoUnitario * labor.indiceAplicacion;
}

export function calcularCostoInsumoProtocolo(insumo: Pick<ProtocoloInsumo, 'dosisPorHa' | 'precioUnitarioEstimado' | 'indiceAplicacion'>) {
  return insumo.dosisPorHa * insumo.precioUnitarioEstimado * insumo.indiceAplicacion;
}

export function calcularCostoProtocolo(protocolo: Pick<ProtocoloProductivoDetalle, 'etapas'>) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + calcularCostoLaborProtocolo(labor), 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + calcularCostoInsumoProtocolo(insumo), 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}
