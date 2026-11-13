import { randomUUID } from 'node:crypto';
import type { CrearAnexoPlanificacionRequest, PlanificacionAgricola, PlanificacionAgricolaLinea } from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerClienteSesion } from '../seguridad/alcanceCliente';
import { bloquearPadronesCliente } from './consolidarCopiaErp';
import { guardarPlanificacionEnTransaccion } from './planificacionesPrisma';
import { crearErrorValidacion } from './validacionesPlanificacion';
import type { UsuarioAuditoria } from './auditoria';
import { resolverLotesCanonicos } from './politicaDocumentosPlanificacion';

export async function obtenerLotesElegiblesAnexo(originalId: string, usuario?: UsuarioAuditoria) {
  const clienteId = obtenerClienteSesion(usuario);
  const original = await prisma.planificacionAgricola.findFirst({ where: { id: originalId, clienteId, tipoDocumento: 'base', estado: 'cerrada', escenarioOriginal: true } });
  if (!original) throw crearErrorValidacion('No existe la original cerrada solicitada.', 404);
  const ocupados = await prisma.planificacionLoteAprobado.findMany({ where: { clienteId, campaniaErpId: original.campaniaErpId } });
  const lotes = await prisma.loteApp.findMany({ where: { clienteId, id: { notIn: ocupados.map((r) => r.loteAppId) } }, include: { campo: true }, orderBy: { nombre: 'asc' } });
  const borradores = await prisma.planificacionAlcanceLote.findMany({ where: {
    planificacion: { clienteId, campaniaErpId: original.campaniaErpId, tipoDocumento: 'anexo', estado: { notIn: ['cerrada', 'deshabilitada'] } },
  }, select: { loteAppId: true } });
  const propuestos = new Set(borradores.map((r) => r.loteAppId));
  return lotes.map((lote) => ({ id: lote.id, nombre: lote.nombre, campoNombre: lote.campo.nombre, superficieProductiva: lote.superficieProductiva, enOtroBorrador: propuestos.has(lote.id) }));
}

/** Unica entrada que puede crear un documento anexo; su parentesco lo determina el servidor. */
export async function crearAnexoPlanificacion(originalId: string, datos: CrearAnexoPlanificacionRequest, usuario?: UsuarioAuditoria) {
  const clienteId = obtenerClienteSesion(usuario);
  if (!datos || typeof datos.nombre !== 'string' || !datos.nombre.trim() || typeof datos.motivoIncorporacion !== 'string'
    || typeof datos.fechaIncorporacion !== 'string' || !Array.isArray(datos.loteAppIds) || !datos.loteAppIds.length
    || datos.loteAppIds.some((id) => typeof id !== 'string' || !id)) throw crearErrorValidacion('Indica nombre, motivo, fecha y al menos un lote para el anexo.');
  return prisma.$transaction(async (tx) => {
    await bloquearPadronesCliente(tx, clienteId);
    const original = await tx.planificacionAgricola.findFirst({ where: { id: originalId, clienteId, tipoDocumento: 'base', escenarioOriginal: true, estado: 'cerrada' } });
    if (!original) throw crearErrorValidacion('No existe una original cerrada accesible para crear el anexo.', 404);
    const ids = [...new Set(await resolverLotesCanonicos(tx, clienteId, datos.loteAppIds))];
    const lotes = await tx.loteApp.findMany({ where: { clienteId, id: { in: ids } }, include: { campo: true } });
    if (lotes.length !== ids.length) throw crearErrorValidacion('Los lotes deben pertenecer al cliente.', 403);
    const id = randomUUID();
    const ahora = new Date().toISOString();
    const lineas: PlanificacionAgricolaLinea[] = lotes.map((lote) => ({
      id: randomUUID(), planificacionId: id, empresaErpId: lote.campo.empresaErpId,
      campoAppId: lote.campoAppId, campoErpId: lote.campo.campoErpId ?? undefined,
      loteAppId: lote.id, loteErpId: lote.loteErpId ?? undefined, actividadAppId: '',
      hectareasPlanificadas: lote.superficieProductiva, rindeEstimado: 0, precioVentaEstimado: 0,
      destinoVenta: '', destinoVentaManual: false, precioVentaManual: false, gastosComercialesEstimados: 0, ingresoBrutoEstimado: 0, ingresoNetoEstimado: 0,
      costoProduccionEstimado: 0, margenBrutoEstimado: 0, estado: 'borrador', createdAt: ahora, updatedAt: ahora,
    }));
    const planificacion: PlanificacionAgricola = {
      id, clienteId, tipoDocumento: 'anexo', planificacionOriginalId: original.id,
      campaniaErpId: original.campaniaErpId, nombre: datos.nombre.trim(),
      motivoIncorporacion: datos.motivoIncorporacion.trim(), fechaIncorporacion: datos.fechaIncorporacion,
      alcanceLoteIds: ids, estado: 'borrador', escenarioOriginal: false, lineas, createdAt: ahora, updatedAt: ahora,
    };
    return guardarPlanificacionEnTransaccion(tx, id, { planificacion, origen: 'web', motivo: datos.motivoIncorporacion }, usuario, { crearAnexo: true });
  }, { timeout: 60000, maxWait: 10000 });
}
