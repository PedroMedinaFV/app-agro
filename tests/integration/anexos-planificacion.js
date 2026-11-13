const test = require('node:test');
const assert = require('node:assert/strict');

module.exports = function registrarPruebasAnexos({ prisma, request, clientes, usuarios, campos }) {
  const campania = 'campania-anexos-testing';
  const protoId = 'protocolo-anexos-testing';
  const actividad = 'test-actividad-a';
  const loteId = (n) => `lote-anexos-${n}`;
  let original;
  let originalAntes;

  const guardar = (plan) => request(`/planificacion/${plan.id}`, { usuario: 'adminA', method: 'PUT', body: { planificacion: { ...plan, alcanceLoteIds: [...new Set(plan.lineas.map((l) => l.loteAppId))] }, origen: 'web' }, timeout: 90000 });
  const cerrar = (id) => request(`/planificacion/${id}/cerrar`, { usuario: 'adminA', body: { origen: 'web' }, timeout: 90000 });
  const crear = (lotes, originalId = original.id, usuario = 'adminA') => request(`/planificacion/${originalId}/anexos`, { usuario, body: { nombre: 'Incorporacion', motivoIncorporacion: 'Nueva unidad productiva', fechaIncorporacion: '2026-11-13', loteAppIds: lotes }, timeout: 90000 });
  function completar(plan) {
    return { ...plan, lineas: plan.lineas.map((l) => ({ ...l, actividadAppId: actividad, protocoloId: protoId, hectareasPlanificadas: 10, rindeEstimado: 3, precioVentaEstimado: 200, costoProduccionEstimado: 100 })) };
  }

  test('anexos HTTP: borrador incompleto, retiro explicito, incorporacion, cierre y consolidado sin modificar original', async () => {
    await prisma.protocoloProductivo.create({ data: { id: protoId, clienteId: clientes.a, nombre: 'Protocolo anexos', descripcion: 'Fixture ficticio de anexos', campaniaErpId: campania, actividadAppId: actividad, tipoFecha: 'absoluta', costoEstimadoPorHa: 10 } });
    await prisma.loteApp.createMany({ data: [0, 1, 2, 3].map((n) => ({ id: loteId(n), clienteId: clientes.a, campoAppId: campos.a.id, nombre: `Lote anexo ${n}`, superficieTotal: 50, superficieProductiva: 40 })) });
    const ahora = new Date().toISOString();
    const linea = (n) => ({ id: `linea-base-anexos-${n}`, planificacionId: 'base-anexos', empresaErpId: campos.a.empresaErpId, campoAppId: campos.a.id, campoErpId: campos.a.campoErpId, loteAppId: loteId(n), actividadAppId: '', destinoVenta: '', destinoVentaManual: true, precioVentaEstimado: 0, precioVentaManual: true, hectareasPlanificadas: 10, rindeEstimado: 0, gastosComercialesEstimados: 0, costoProduccionEstimado: 0, ingresoBrutoEstimado: 0, ingresoNetoEstimado: 0, margenBrutoEstimado: 0, estado: 'borrador', createdAt: ahora, updatedAt: ahora });
    original = { id: 'base-anexos', clienteId: clientes.a, campaniaErpId: campania, nombre: 'Original anexos', estado: 'borrador', escenarioOriginal: false, lineas: [completar({ lineas: [linea(0)] }).lineas[0], linea(1)], createdAt: ahora, updatedAt: ahora };
    assert.equal((await guardar(original)).status, 200);
    assert.equal((await cerrar(original.id)).status, 409);
    assert.equal((await prisma.planificacionAgricola.findUnique({ where: { id: original.id } })).estado, 'borrador');
    original.lineas = original.lineas.slice(0, 1);
    assert.equal((await guardar(original)).status, 200);
    assert.equal((await cerrar(original.id)).status, 200);
    originalAntes = await prisma.planificacionAgricola.findUnique({ where: { id: original.id }, include: { lineas: true, alcance: true } });
    const elegibles = await request(`/planificacion/${original.id}/lotes-anexo`, { usuario: 'adminA' });
    assert.equal(elegibles.body.lotes.some((l) => l.id === loteId(0)), false);
    assert.equal(elegibles.body.lotes.some((l) => l.id === loteId(1)), true);
    assert.equal((await crear([loteId(0)])).status, 409);
    assert.equal((await crear([loteId(1)], original.id, 'operadorA')).status, 403);
    assert.equal((await crear([loteId(1)], original.id, 'adminB')).status, 404);
    const respuesta = await crear([loteId(1)]);
    assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body));
    const anexo = respuesta.body.planificacion;
    assert.equal(anexo.tipoDocumento, 'anexo');
    assert.equal(anexo.planificacionOriginalId, original.id);
    assert.equal(anexo.numeroAnexo, undefined);
    assert.equal((await cerrar(anexo.id)).status, 409);
    const sinAnexo = await request(`/planificacion/${original.id}/consolidado`, { usuario: 'adminA' });
    assert.equal(sinAnexo.body.anexos.length, 0);
    assert.equal((await guardar(completar(anexo))).status, 200);
    const cerrado = await cerrar(anexo.id);
    assert.equal(cerrado.status, 200, JSON.stringify(cerrado.body));
    assert.equal(cerrado.body.planificacion.numeroAnexo, 1);
    assert.equal(cerrado.body.planificacion.escenarioOriginal, false);
    assert.equal((await guardar(completar(anexo))).status, 409);
    assert.equal((await crear([loteId(2)], anexo.id)).status, 404);
    const consolidado = await request(`/planificacion/${original.id}/consolidado`, { usuario: 'adminA' });
    assert.equal(consolidado.body.anexos.length, 1);
    assert.equal(consolidado.body.lineas.length, 2);
    assert.equal(consolidado.body.totales.hectareasCultivo, 20);
    const ficha = await request(`/operativo/lotes/${loteId(1)}/ficha`, { usuario: 'adminA' });
    assert.ok(ficha.body.planificaciones.some((p) => p.tipoDocumento === 'anexo' && p.numeroAnexo === 1));
    assert.equal((await request(`/planificacion/${original.id}/consolidado`, { usuario: 'adminB' })).status, 404);
    assert.deepEqual(await prisma.planificacionAgricola.findUnique({ where: { id: original.id }, include: { lineas: true, alcance: true } }), originalAntes);
  });

  test('anexos HTTP: dos cierres concurrentes no duplican lote ni numero y permiten anexos sucesivos', async () => {
    const a = await crear([loteId(2)]);
    const b = await crear([loteId(2)]);
    assert.equal(a.status, 201, JSON.stringify(a.body));
    assert.equal(b.status, 201, JSON.stringify(b.body));
    for (const respuesta of [a, b]) assert.equal((await guardar(completar(respuesta.body.planificacion))).status, 200);
    const resultados = await Promise.all([cerrar(a.body.planificacion.id), cerrar(b.body.planificacion.id)]);
    assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 409]);
    assert.equal(resultados.find((r) => r.status === 200).body.planificacion.numeroAnexo, 2);
    const perdedor = resultados[0].status === 409 ? a : b;
    assert.equal((await prisma.planificacionAgricola.findUnique({ where: { id: perdedor.body.planificacion.id } })).estado, 'borrador');
    assert.equal(await prisma.planificacionLoteAprobado.count({ where: { clienteId: clientes.a, campaniaErpId: campania, loteAppId: loteId(2) } }), 1);
    const tercero = await crear([loteId(3)]);
    assert.equal(tercero.status, 201);
    assert.equal((await guardar(completar(tercero.body.planificacion))).status, 200);
    const cierre = await cerrar(tercero.body.planificacion.id);
    assert.equal(cierre.status, 200, JSON.stringify(cierre.body));
    assert.equal(cierre.body.planificacion.numeroAnexo, 3);
    const datos = await request(`/planificacion/${original.id}/consolidado`, { usuario: 'adminA' });
    assert.equal(datos.body.anexos.length, 3);
    assert.deepEqual(await prisma.planificacionAgricola.findUnique({ where: { id: original.id }, include: { lineas: true, alcance: true } }), originalAntes);
    const auditorias = await prisma.auditoriaEvento.count({ where: { clienteId: clientes.a, entidadId: cierre.body.planificacion.id, accion: 'cerrar' } });
    assert.equal(auditorias, 1);
  });

  test('anexos HTTP: consolidar un lote con ERP conserva la reserva y un alias no permite duplicarlo', async () => {
    const { idCopiaPadronErp } = require('../../packages/tipos/dist');
    const erpId = 'test-erp-lote-anexo-alias';
    const copiaId = idCopiaPadronErp('lote-app', erpId, clientes.a);
    const canonicoId = 'lote-anexo-alias-canonico';
    await prisma.erpLote.create({ data: { erpId, empresaErpId: campos.a.empresaErpId, idLote: 98990, idCampo: 1,
      campoErpId: campos.a.campoErpId, codigo: '98990', nombre: 'LOTE ALIAS', areaHectareas: 50, hectareasProductivas: 40, actualizadoEn: new Date() } });
    await prisma.loteApp.create({ data: { id: copiaId, clienteId: clientes.a, campoAppId: campos.a.id, loteErpId: erpId,
      nombre: 'LOTE ALIAS', superficieTotal: 50, superficieProductiva: 40, estadoVinculacion: 'vinculado_erp' } });
    const creado = await crear([copiaId]);
    assert.equal(creado.status, 201, JSON.stringify(creado.body));
    assert.equal((await guardar(completar(creado.body.planificacion))).status, 200);
    const aprobado = await cerrar(creado.body.planificacion.id);
    assert.equal(aprobado.status, 200, JSON.stringify(aprobado.body));
    const snapshotAntes = aprobado.body.planificacion.lineas[0].padronesSnapshot;
    const zona = { id: canonicoId, clienteId: clientes.a, campoAppId: campos.a.id, nombre: 'Lote provisorio alias', superficieTotal: 50, superficieProductiva: 40, estadoVinculacion: 'provisorio' };
    assert.equal((await request(`/lotes-app/${canonicoId}`, { usuario: 'adminA', method: 'PUT', body: { lote: zona, origen: 'web' } })).status, 200);
    const vinculo = await request(`/lotes-app/${canonicoId}`, { usuario: 'adminA', method: 'PUT', body: { lote: { ...zona, loteErpId: erpId }, origen: 'web' }, timeout: 90000 });
    assert.equal(vinculo.status, 200, JSON.stringify(vinculo.body));
    const reserva = await prisma.planificacionLoteAprobado.findUnique({ where: { clienteId_campaniaErpId_loteAppId: { clienteId: clientes.a, campaniaErpId: campania, loteAppId: canonicoId } } });
    assert.equal(reserva.planificacionId, creado.body.planificacion.id);
    assert.equal(await prisma.planificacionAlcanceLote.count({ where: { planificacionId: reserva.planificacionId, loteAppId: canonicoId } }), 1);
    assert.equal((await crear([copiaId])).status, 409, 'el alias debe resolver la misma reserva canonica');
    const persistida = await prisma.planificacionAgricolaLinea.findFirst({ where: { planificacionId: reserva.planificacionId } });
    assert.equal(persistida.loteAppId, canonicoId);
    assert.deepEqual(persistida.padronesSnapshot, snapshotAntes, 'no se reescribe la evidencia historica');
  });
};
