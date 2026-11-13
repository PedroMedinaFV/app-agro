import { consolidarPlanificacion } from '@agro/tipos';
import { prisma } from '../../prisma';
import { mapearPlanificacion } from './serializacionPlanificacion';
import { crearErrorValidacion } from './validacionesPlanificacion';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';
import { obtenerClienteSesion } from '../seguridad/alcanceCliente';
import type { UsuarioAuditoria } from './auditoria';

export async function obtenerConsolidadoPlanificacion(id: string, usuario: UsuarioAuditoria & { rol?: string }) {
  const clienteId = obtenerClienteSesion(usuario);
  const campos = await obtenerCamposAsignados({ sub: usuario.id || '', clienteId, rol: usuario.rol });
  const documentos = await prisma.planificacionAgricola.findMany({
    where: { clienteId, estado: 'cerrada', OR: [{ id, tipoDocumento: 'base', escenarioOriginal: true }, { planificacionOriginalId: id, tipoDocumento: 'anexo' }] },
    include: { lineas: { orderBy: { createdAt: 'asc' } }, alcance: true }, orderBy: { numeroAnexo: 'asc' },
  });
  const permitidos = documentos.map((d) => {
    const plan = mapearPlanificacion(d);
    if (campos === null) return plan;
    // Las asignaciones se expresan por ID ERP; los importes se calculan despues de filtrar.
    plan.lineas = plan.lineas.filter((l) => Boolean(l.campoErpId && campos.includes(l.campoErpId)));
    plan.alcanceLoteIds = [...new Set(plan.lineas.map((l) => l.loteAppId))];
    return plan;
  });
  const original = permitidos.find((p) => p.id === id && p.escenarioOriginal);
  if (!original) throw crearErrorValidacion('No existe la original cerrada solicitada.', 404);
  return consolidarPlanificacion(original, permitidos);
}
