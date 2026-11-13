import type { Prisma } from '@prisma/client';
import type { PlanificacionAgricola } from '@agro/tipos';
import { recalcularLineaPlanificacionPersistida } from './validacionesPlanificacion';
import {
  serializarGastosComercialesSnapshot,
  serializarPadronesSnapshot,
  serializarDestinoVentaSnapshot,
  serializarPrecioVentaSnapshot,
  serializarProtocoloSnapshot,
} from './serializacionPlanificacion';

const TAMANO_BLOQUE_LINEAS = 250;

/** Cabecera, reemplazo de lineas y auditoria deben compartir esta transaccion. */
export async function reemplazarLineas(tx: Prisma.TransactionClient, planificacion: PlanificacionAgricola) {
  await tx.planificacionAgricolaLinea.deleteMany({ where: { planificacionId: planificacion.id } });

  const lineas = planificacion.lineas.map((lineaOriginal) => {
    const linea = recalcularLineaPlanificacionPersistida(lineaOriginal);

    return {
      id: linea.id,
      planificacionId: planificacion.id,
      empresaErpId: linea.empresaErpId,
      campoAppId: linea.campoAppId,
      campoErpId: linea.campoErpId,
      loteAppId: linea.loteAppId,
      loteErpId: linea.loteErpId,
      actividadAppId: linea.actividadAppId || null,
      actividadErpId: linea.actividadErpId,
      cultivoErpId: linea.cultivoErpId,
      padronesSnapshot: serializarPadronesSnapshot(linea.padronesSnapshot),
      destinoReferenciaId: linea.destinoReferenciaId,
      destinoVenta: linea.destinoVenta,
      destinoVentaManual: linea.destinoVentaManual,
      destinoVentaSnapshot: serializarDestinoVentaSnapshot(linea.destinoVentaSnapshot),
      precioReferenciaId: linea.precioReferenciaId,
      precioVentaEstimado: linea.precioVentaEstimado,
      precioVentaManual: linea.precioVentaManual,
      precioVentaSnapshot: serializarPrecioVentaSnapshot(linea.precioVentaSnapshot),
      hectareasPlanificadas: linea.hectareasPlanificadas,
      rindeEstimado: linea.rindeEstimado,
      gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
      gastosComercialesEstimados: linea.gastosComercialesEstimados,
      gastosComercialesSnapshot: serializarGastosComercialesSnapshot(linea.gastosComercialesSnapshot),
      protocoloId: linea.protocoloId,
      protocoloSnapshot: serializarProtocoloSnapshot(linea.protocoloSnapshot),
      ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
      ingresoNetoEstimado: linea.ingresoNetoEstimado,
      costoProduccionEstimado: linea.costoProduccionEstimado,
      margenBrutoEstimado: linea.margenBrutoEstimado,
      margenBrutoActualizado: linea.margenBrutoActualizado,
      estado: linea.estado,
    };
  });

  for (let inicio = 0; inicio < lineas.length; inicio += TAMANO_BLOQUE_LINEAS) {
    await tx.planificacionAgricolaLinea.createMany({
      data: lineas.slice(inicio, inicio + TAMANO_BLOQUE_LINEAS),
    });
  }
}

