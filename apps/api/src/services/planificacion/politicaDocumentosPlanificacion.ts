import type { PlanificacionAgricola } from '@agro/tipos';
import type { Prisma } from '@prisma/client';
import { crearErrorValidacion } from './validacionesPlanificacion';

export function lotesDelDocumento(plan: PlanificacionAgricola) {
  return [...new Set(plan.alcanceLoteIds ?? plan.lineas.map((linea) => linea.loteAppId))];
}

export async function resolverLotesCanonicos(tx: Prisma.TransactionClient, clienteId: string, ids: string[]) {
  const aliases = await tx.aliasPadronApp.findMany({ where: { clienteId, tipo: 'lotes', anteriorId: { in: ids } } });
  const mapa = new Map(aliases.map((a) => [a.anteriorId, a.actualId]));
  return ids.map((id) => mapa.get(id) ?? id);
}

export async function normalizarAlcanceDocumento(tx: Prisma.TransactionClient, plan: PlanificacionAgricola) {
  const ids = [...new Set([...lotesDelDocumento(plan), ...plan.lineas.map((l) => l.loteAppId)])];
  const actuales = await resolverLotesCanonicos(tx, plan.clienteId, ids);
  const mapa = new Map(ids.map((id, indice) => [id, actuales[indice]]));
  if (plan.alcanceLoteIds) plan.alcanceLoteIds = [...new Set(plan.alcanceLoteIds.map((id) => mapa.get(id) ?? id))];
  plan.lineas = plan.lineas.map((l) => ({ ...l, loteAppId: mapa.get(l.loteAppId) ?? l.loteAppId }));
}

export function validarIntegridadCierre(plan: PlanificacionAgricola) {
  const pendientes = plan.lineas.filter((l) => !l.actividadAppId || !l.protocoloId);
  const sinLineas = lotesDelDocumento(plan).filter((id) => !plan.lineas.some((l) => l.loteAppId === id));
  if (pendientes.length || sinLineas.length) {
    throw crearErrorValidacion(`Completa actividad/protocolo o quita explicitamente las lineas/lotes pendientes antes de cerrar: ${[
      ...pendientes.map((l) => `campo ${l.campoAppId}, lote ${l.loteAppId}, linea ${l.id}`), ...sinLineas.map((id) => `lote ${id} sin lineas`),
    ].join('; ')}.`, 409);
  }
}

export async function validarPoliticaDocumento(
  tx: Prisma.TransactionClient, plan: PlanificacionAgricola, existente: PlanificacionAgricola | null,
  permitirNuevoAnexo = false,
) {
  const tipo = plan.tipoDocumento ?? 'base';
  if (!['base', 'anexo'].includes(tipo)) throw crearErrorValidacion('Tipo de documento invalido.');
  if (existente && (tipo !== (existente.tipoDocumento ?? 'base') || plan.planificacionOriginalId !== existente.planificacionOriginalId)) {
    throw crearErrorValidacion('No se puede cambiar el tipo ni la original de un documento.', 409);
  }
  if (tipo === 'base') {
    if (plan.planificacionOriginalId) throw crearErrorValidacion('Un escenario base no puede tener original asociada.');
    return;
  }
  if (!existente && !permitirNuevoAnexo) throw crearErrorValidacion('Crea el anexo desde la planificacion original.', 409);
  const original = await tx.planificacionAgricola.findFirst({
    where: { id: plan.planificacionOriginalId || '', clienteId: plan.clienteId, tipoDocumento: 'base', estado: 'cerrada', escenarioOriginal: true },
    include: { lineas: true, alcance: true },
  });
  if (!original || original.campaniaErpId !== plan.campaniaErpId) throw crearErrorValidacion('El anexo requiere una original cerrada del mismo cliente y campania.', 409);
  if (!original.lineas.length || original.lineas.some((l) => !l.actividadAppId || !l.protocoloId || l.hectareasPlanificadas <= 0)
    || original.alcance.some((a) => !original.lineas.some((l) => l.loteAppId === a.loteAppId))) {
    throw crearErrorValidacion('La original historica tiene lotes/lineas incompletos y requiere revision explicita antes de crear anexos.', 409);
  }
  if (typeof plan.motivoIncorporacion !== 'string' || !plan.motivoIncorporacion.trim()) throw crearErrorValidacion('El anexo debe tener motivo de incorporacion.');
  const fecha = plan.fechaIncorporacion ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
    throw crearErrorValidacion('La fecha de incorporacion debe ser una fecha valida (AAAA-MM-DD).');
  }
}

export async function validarDisponibilidadAlcance(tx: Prisma.TransactionClient, plan: PlanificacionAgricola) {
  const ids = lotesDelDocumento(plan);
  if (ids.some((id) => typeof id !== 'string' || !id)) throw crearErrorValidacion('Alcance de lotes invalido.');
  if (plan.lineas.some((l) => !ids.includes(l.loteAppId))) throw crearErrorValidacion('Cada linea debe pertenecer al alcance seleccionado.');
  const lotes = await tx.loteApp.count({ where: { clienteId: plan.clienteId, id: { in: ids } } });
  if (lotes !== ids.length) throw crearErrorValidacion('El alcance incluye lotes que no pertenecen al cliente.', 403);
  if (plan.tipoDocumento === 'anexo') {
    const ocupados = await tx.planificacionLoteAprobado.findMany({ where: {
      clienteId: plan.clienteId, campaniaErpId: plan.campaniaErpId, loteAppId: { in: ids }, planificacionId: { not: plan.id },
    } });
    if (ocupados.length) throw crearErrorValidacion(`Los lotes ya pertenecen a una planificacion cerrada: ${ocupados.map((o) => o.loteAppId).join(', ')}. Quita esos lotes del anexo.`, 409);
  }
}

export async function guardarAlcance(tx: Prisma.TransactionClient, plan: PlanificacionAgricola) {
  await tx.planificacionAlcanceLote.deleteMany({ where: { planificacionId: plan.id } });
  await tx.planificacionAlcanceLote.createMany({ data: lotesDelDocumento(plan).map((loteAppId) => ({ planificacionId: plan.id, loteAppId })) });
}
