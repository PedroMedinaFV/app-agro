import type { Prisma } from '@prisma/client';
import { crearProyectorDatosMaestros } from './datosMaestrosPadronesErp';
import { datosZonaDesdeErp } from '../zonas/datosZonaErp';
import { registrarAuditoria } from './auditoria';

/** Dentro del lock/transaccion del cliente; no crea identidades ni reescribe snapshots. */
export async function sincronizarDatosMaestrosPadrones(tx: Prisma.TransactionClient, clienteId: string) {
  const [zonas, campos, lotes, especies, actividades, insumos, labores] = await Promise.all([
    tx.zonaApp.findMany({ where: { clienteId, zonaErpId: { not: null } } }),
    tx.campoApp.findMany({ where: { clienteId, campoErpId: { not: null } } }),
    tx.loteApp.findMany({ where: { clienteId, loteErpId: { not: null } } }),
    tx.especieApp.findMany({ where: { clienteId, especieErpId: { not: null } } }),
    tx.actividadApp.findMany({ where: { clienteId, actividadErpId: { not: null } } }),
    tx.insumoApp.findMany({ where: { clienteId, insumoErpId: { not: null } } }),
    tx.servicioApp.findMany({ where: { clienteId, servicioErpId: { not: null } } }),
  ]);
  const proyectar = await crearProyectorDatosMaestros(tx, clienteId);
  const [zonasErp, camposErp, lotesErp, especiesErp, actividadesErp, insumosErp, laboresErp] = await Promise.all([
    tx.erpZona.findMany({ where: { erpId: { in: zonas.map((r) => r.zonaErpId!) } } }),
    tx.erpCampo.findMany({ where: { erpId: { in: campos.map((r) => r.campoErpId!) } } }),
    tx.erpLote.findMany({ where: { erpId: { in: lotes.map((r) => r.loteErpId!) } } }),
    tx.erpEspecie.findMany({ where: { erpId: { in: especies.map((r) => r.especieErpId!) } } }),
    tx.erpActividad.findMany({ where: { erpId: { in: actividades.map((r) => r.actividadErpId!) } } }),
    tx.erpInsumo.findMany({ where: { erpId: { in: insumos.map((r) => r.insumoErpId!) } } }),
    tx.erpServicio.findMany({ where: { erpId: { in: labores.map((r) => r.servicioErpId!) } } }),
  ]);
  function comparable(valor: unknown) { return valor instanceof Date ? valor.toISOString() : valor; }
  async function refrescar<R extends { id: string }, E extends { erpId: string }, D extends object>(
    entidad: string, registros: R[], fuentes: E[], referencia: (registro: R) => string | null,
    proyectarFuente: (fuente: E) => D, actualizar: (id: string, datos: D) => Promise<unknown>,
  ) {
    const porErp = new Map(fuentes.map((fuente) => [fuente.erpId, fuente]));
    for (const registro of registros) {
      const fuente = porErp.get(referencia(registro)!);
      if (!fuente) continue; // Una ausencia en cache no autoriza borrar datos operativos.
      const datos = proyectarFuente(fuente);
      const cambios = Object.entries(datos).filter(([clave, valor]) => comparable(Reflect.get(registro, clave)) !== comparable(valor));
      if (!cambios.length) continue;
      await actualizar(registro.id, datos);
      await registrarAuditoria(tx, {
        clienteId, entidad, entidadId: registro.id, accion: 'sincronizar_datos_erp', origen: 'erp',
        valoresAntes: Object.fromEntries(cambios.map(([clave]) => [clave, comparable(Reflect.get(registro, clave))])),
        valoresDespues: Object.fromEntries(cambios.map(([clave, valor]) => [clave, comparable(valor)])),
        metadata: { erpId: fuente.erpId },
      });
    }
  }
  await refrescar('ZonaApp', zonas, zonasErp, (r) => r.zonaErpId, datosZonaDesdeErp, (id, data) => tx.zonaApp.update({ where: { id }, data }));
  await refrescar('CampoApp', campos, camposErp, (r) => r.campoErpId, proyectar.campos, (id, data) => tx.campoApp.update({ where: { id }, data }));
  await refrescar('LoteApp', lotes, lotesErp, (r) => r.loteErpId, proyectar.lotes, (id, data) => tx.loteApp.update({ where: { id }, data }));
  await refrescar('EspecieApp', especies, especiesErp, (r) => r.especieErpId, proyectar.especies, (id, data) => tx.especieApp.update({ where: { id }, data }));
  await refrescar('ActividadApp', actividades, actividadesErp, (r) => r.actividadErpId, proyectar.actividades, (id, data) => tx.actividadApp.update({ where: { id }, data }));
  await refrescar('InsumoApp', insumos, insumosErp, (r) => r.insumoErpId, proyectar.insumos, (id, data) => tx.insumoApp.update({ where: { id }, data }));
  await refrescar('ServicioApp', labores, laboresErp, (r) => r.servicioErpId, proyectar.labores, (id, data) => tx.servicioApp.update({ where: { id }, data }));
}
