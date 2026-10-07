import {
  calcularGastosComercialesLinea,
  calcularResumenGrupoPlanificacion,
  calcularResumenPlanificacion,
  DestinoApp,
  ErpCultivo,
  PlanificacionSnapshot,
  PrecioReferencia,
  lineaPlanificacionEstaCompleta,
  lineaPlanificacionTieneDatos,
  limpiarSnapshotsLineaPlanificacion,
  obtenerClaveLinea,
  obtenerClavesDuplicadas,
  obtenerSuperficieInicialLote,
  recalcularLineaPlanificacion,
  resumirPlanificacionLocal,
  tieneLineasDuplicadasEnPlanificacion,
} from '@agro/tipos';

export {
  calcularGastosComercialesLinea,
  calcularResumenGrupoPlanificacion,
  calcularResumenPlanificacion,
  lineaPlanificacionEstaCompleta,
  lineaPlanificacionTieneDatos,
  limpiarSnapshotsLineaPlanificacion,
  obtenerClaveLinea,
  obtenerClavesDuplicadas,
  obtenerSuperficieInicialLote,
  recalcularLineaPlanificacion,
  resumirPlanificacionLocal,
  tieneLineasDuplicadasEnPlanificacion,
};

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
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

export function crearDestinoReferenciaDesdePrecio(precio: PrecioReferencia): DestinoApp {
  const ahora = new Date().toISOString();
  const destinoVenta = limpiarTextoVisible(precio.destinoVenta);

  return {
    id: `destino-precio-${precio.id}`,
    clienteId: precio.clienteId,
    empresaErpId: precio.empresaErpId,
    destinoVenta,
    destinoVentaNormalizado: normalizarTexto(destinoVenta),
    descripcion: `Destino creado desde precio ${destinoVenta}`,
    activo: true,
    origen: 'app',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function anexarDestinoSiNoExiste(snapshotActual: PlanificacionSnapshot, precio: PrecioReferencia): PlanificacionSnapshot {
  const destinoNormalizado = normalizarTexto(precio.destinoVenta);
  const existeDestino = snapshotActual.destinosReferencia.some((destino) => (
    (destino.destinoVentaNormalizado || normalizarTexto(destino.destinoVenta)) === destinoNormalizado
  ));

  if (existeDestino) {
    return snapshotActual;
  }

  return {
    ...snapshotActual,
    destinosReferencia: [crearDestinoReferenciaDesdePrecio(precio), ...snapshotActual.destinosReferencia],
  };
}
