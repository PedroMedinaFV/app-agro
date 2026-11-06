import type { Prisma } from '@prisma/client';
import type { PlanificacionAgricola } from '@agro/tipos';
import { crearErrorValidacion } from './validacionesPlanificacion';

type RepositoriosAlcance = Pick<Prisma.TransactionClient, 'campoApp' | 'loteApp' | 'actividadApp' | 'protocoloProductivo'>;

export async function validarAlcanceLineasPlanificacion(tx: RepositoriosAlcance, plan: PlanificacionAgricola) {
  if (!plan.lineas.length) return;
  const ids = (campo: 'campoAppId' | 'loteAppId' | 'actividadAppId' | 'protocoloId') =>
    [...new Set(plan.lineas.map((linea) => linea[campo]).filter((id): id is string => Boolean(id)))];
  const [campos, lotes, actividades, protocolos] = await Promise.all([
    tx.campoApp.findMany({ where: { clienteId: plan.clienteId, id: { in: ids('campoAppId') } }, select: { id: true, empresaErpId: true } }),
    tx.loteApp.findMany({ where: { clienteId: plan.clienteId, id: { in: ids('loteAppId') } }, select: { id: true, campoAppId: true } }),
    tx.actividadApp.findMany({ where: { clienteId: plan.clienteId, id: { in: ids('actividadAppId') } }, select: { id: true } }),
    ids('protocoloId').length ? tx.protocoloProductivo.findMany({ where: { clienteId: plan.clienteId, id: { in: ids('protocoloId') } }, select: { id: true } }) : [],
  ]);
  const camposPorId = new Map(campos.map((campo) => [campo.id, campo]));
  const lotesPorId = new Map(lotes.map((lote) => [lote.id, lote]));
  const actividadesIds = new Set(actividades.map((actividad) => actividad.id));
  const protocolosIds = new Set(protocolos.map((protocolo) => protocolo.id));
  for (const linea of plan.lineas) {
    const campo = camposPorId.get(linea.campoAppId);
    const lote = lotesPorId.get(linea.loteAppId);
    if (!campo || campo.empresaErpId !== linea.empresaErpId || !lote || lote.campoAppId !== campo.id
      || !actividadesIds.has(linea.actividadAppId)
      || (linea.protocoloId && !protocolosIds.has(linea.protocoloId))) {
      throw crearErrorValidacion('Las referencias de la linea deben pertenecer al cliente y al campo indicado.', 403);
    }
  }
}
