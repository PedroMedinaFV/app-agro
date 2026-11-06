import type { PadronErpSincronizable } from '@agro/tipos';
import type { UsuarioAuditoria } from '../planificacion/auditoria';
import { asegurarPadronesPlanificacionDesdeErp } from '../planificacion/padronesPlanificacionPrisma';
import { bloqueoSincronizacionErp } from './bloqueoSincronizacionErp';
import { sincronizarSnapshotErp, listarEmpresasErpImportadas } from './sincronizarErp';
import { finalizarSincronizacionErpHistorial, fallarSincronizacionErpHistorial } from './historialSincronizacionErp';

export type DependenciasSincronizacionErp = {
  bloqueo: typeof bloqueoSincronizacionErp;
  sincronizarSnapshot: typeof sincronizarSnapshotErp;
  asegurarPadrones: typeof asegurarPadronesPlanificacionDesdeErp;
  finalizarHistorial: typeof finalizarSincronizacionErpHistorial;
  fallarHistorial: typeof fallarSincronizacionErpHistorial;
};
const dependencias: DependenciasSincronizacionErp = {
  bloqueo: bloqueoSincronizacionErp,
  sincronizarSnapshot: sincronizarSnapshotErp,
  asegurarPadrones: asegurarPadronesPlanificacionDesdeErp,
  finalizarHistorial: finalizarSincronizacionErpHistorial,
  fallarHistorial: fallarSincronizacionErpHistorial,
};

export async function ejecutarSincronizacionErp(
  clienteId: string, usuario?: UsuarioAuditoria, items?: PadronErpSincronizable[], deps = dependencias,
) {
  if (!clienteId?.trim()) throw Object.assign(new Error('La sincronizacion requiere clienteId.'), { statusCode: 400 });
  const reserva = await deps.bloqueo.adquirir(clienteId, usuario?.id, items);
  if (!reserva) throw Object.assign(new Error('Ya hay una sincronizacion en curso para este cliente.'), { statusCode: 409 });
  try {
    return await deps.bloqueo.ejecutar(reserva, async () => {
      const resultado = await deps.sincronizarSnapshot(clienteId, { ...usuario, clienteId }, items);
      if (!(items?.length === 1 && items[0] === 'empresas')) await deps.asegurarPadrones(clienteId, null);
      await deps.finalizarHistorial(reserva.id, clienteId, reserva.itemsEjecutados, resultado);
      return resultado;
    });
  } catch (error) {
    try { await deps.fallarHistorial(reserva.id, error); }
    catch (errorHistorial) { console.error('No se pudo registrar el fallo ERP; se recuperara por vencimiento.', errorHistorial); }
    throw error;
  } finally {
    try { await deps.bloqueo.liberar(reserva); }
    catch (errorLiberacion) { console.error('No se pudo liberar el bloqueo ERP; se recuperara por vencimiento.', errorLiberacion); }
  }
}

export async function importarEmpresasConBloqueo(clienteId: string, usuario?: UsuarioAuditoria) {
  const resultado = await ejecutarSincronizacionErp(clienteId, usuario, ['empresas']);
  return { empresas: resultado.empresas, importadas: await listarEmpresasErpImportadas(), sincronizadoEn: resultado.sincronizadoEn };
}
