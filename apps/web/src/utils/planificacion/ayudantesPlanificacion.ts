import {
  ErpCultivo,
  GastosComercialesReferencia,
  LoteApp,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionAgricolaResumen,
  ProtocoloProductivoResumen,
} from '@agro/tipos';

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function obtenerSuperficieInicialLote(lote: LoteApp) {
  const superficieTotal = Number.isFinite(lote.superficieTotal) && lote.superficieTotal > 0 ? lote.superficieTotal : 0;
  const superficieProductiva = Number.isFinite(lote.superficieProductiva) && lote.superficieProductiva > 0 ? lote.superficieProductiva : 0;

  if (superficieProductiva > 0) {
    return superficieTotal > 0 ? Math.min(superficieProductiva, superficieTotal) : superficieProductiva;
  }

  return superficieTotal;
}

export function obtenerCodigoCampaniaAnterior(codigo?: string) {
  const partes = codigo?.match(/^(\d{2})\/(\d{2})$/);

  if (!partes) {
    return undefined;
  }

  const inicio = Number(partes[1]);
  const fin = Number(partes[2]);

  if (!Number.isFinite(inicio) || !Number.isFinite(fin)) {
    return undefined;
  }

  return `${String(inicio - 1).padStart(2, '0')}/${String(fin - 1).padStart(2, '0')}`;
}

export function idsErpCoinciden(idA?: string, idB?: string) {
  if (!idA || !idB) {
    return false;
  }

  return idA === idB || idA.endsWith(`:${idB}`) || idB.endsWith(`:${idA}`);
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

export function formatearCultivosAntecesores(cultivos: ErpCultivo[], actividadNombrePorErpId: Map<string, string>) {
  if (cultivos.length === 0) {
    return 'Sin datos ERP';
  }

  return cultivos
    .map((cultivo) => {
      const actividad = cultivo.actividadErpId ? actividadNombrePorErpId.get(cultivo.actividadErpId) : undefined;
      const nombre = actividad || cultivo.nombre;

      return `${nombre} (${cultivo.hectareasSembradas.toFixed(2)} ha)`;
    })
    .join(' / ');
}
