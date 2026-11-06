const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { validarSchemaTesting } = require('../../scripts/lib/integration-environment');

// Fallar antes de importar Prisma/app si se intenta ejecutar sin el runner aislado.
validarSchemaTesting(process.env.TEST_SCHEMA || '');
assert.equal(new URL(process.env.DATABASE_URL).searchParams.get('schema'), process.env.TEST_SCHEMA);
assert.equal(process.env.NODE_ENV, 'test');
const { prisma } = require('../../apps/api/dist/prisma');
const { crearApp } = require('../../apps/api/dist/app');
const { crearFixtures, password, clientes, usuarios, campos, lotes } = require('./fixtures');
const fecha = '2026-11-06T12:00:00Z';
const lluvia = (campo = campos.a, lote = lotes.a) => ({ campoAppId: campo.id, loteAppId: lote, milimetros: 12.5, fechaEvento: fecha, origen: 'mobile' });
const observacion = (campo = campos.a, lote = lotes.a) => ({ campoAppId: campo.id, loteAppId: lote, titulo: 'Monitoreo de testing', descripcion: 'Dato ficticio', fechaEvento: fecha, origen: 'mobile' });
let servidor;
let base;
const sesiones = {};

async function request(ruta, { usuario, body, method = body === undefined ? 'GET' : 'POST', token, raw, timeout = 30000 } = {}) {
  const respuesta = await fetch(base + ruta, {
    method, headers: { 'Content-Type': 'application/json', Connection: 'close',
      ...((token || sesiones[usuario]?.token) ? { Authorization: `Bearer ${token || sesiones[usuario].token}` } : {}),
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(timeout),
  });
  return { status: respuesta.status, body: await respuesta.json() };
}

test.before(async () => {
  const contexto = await prisma.$queryRaw`SELECT current_schema() AS schema`;
  assert.equal(contexto[0].schema, process.env.TEST_SCHEMA);
  await crearFixtures(prisma);
  servidor = crearApp().listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}`;
  for (const [nombre, usuario] of Object.entries(usuarios)) {
    const login = await request('/auth/login', { body: { email: usuario.email, password } });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    sesiones[nombre] = login.body;
  }
});
test.after(async () => {
  if (servidor) await new Promise((resolve, reject) => servidor.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

test('migraciones completas aplicadas y login real devuelve sesion sin hash', async () => {
  const historial = await prisma.$queryRaw`SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"`;
  const esperadas = fs.readdirSync(path.join(__dirname, '../../apps/api/prisma/migrations'), { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory()).map((entrada) => entrada.name).sort();
  assert.deepEqual(historial.map((fila) => fila.migration_name).sort(), esperadas);
  assert.ok(historial.every((fila) => fila.finished_at && !fila.rolled_back_at));
  assert.ok(!('password' in sesiones.adminA.usuario));
  const incorrecto = await request('/auth/login', { body: { email: usuarios.adminA.email, password: 'incorrecto' } });
  assert.equal(incorrecto.status, 401);
});

test('compatibilidad de migraciones no cambia nombres en un schema ya actualizado', async () => {
  const nombres = () => prisma.$queryRaw`
    SELECT 'constraint:' || conname AS nombre FROM pg_constraint WHERE connamespace = current_schema()::regnamespace
    UNION ALL SELECT 'index:' || indexname FROM pg_indexes WHERE schemaname = current_schema() ORDER BY nombre
  `;
  const antes = await nombres();
  const compatibilidad = fs.readFileSync(path.join(__dirname, '../../apps/api/prisma/migrations/20261001181546_compatibilidad_nombres_replay/migration.sql'), 'utf8');
  await prisma.$executeRawUnsafe(compatibilidad);
  assert.deepEqual(await nombres(), antes);
});

test('middleware real rechaza falta de JWT, firma invalida y acceso administrativo de operador', async () => {
  assert.equal((await request('/precipitaciones')).status, 401);
  assert.equal((await request('/precipitaciones', { token: 'firma-invalida' })).status, 401);
  assert.equal((await request('/usuarios', { usuario: 'operadorA' })).status, 403);
  assert.equal((await request('/usuarios', { usuario: 'adminA' })).status, 200);
  assert.equal((await request('/auth/login', { method: 'POST', raw: '{invalido' })).status, 400);
});

test('registro publico no acepta privilegios ni permite elegir cliente mediante querystring', async () => {
  const registrada = await request('/auth/registro', { body: {
    email: 'registro-publico@agro.test', password, nombre: 'Usuario ficticio', rol: 'admin', clienteId: clientes.a,
  } });
  assert.equal(registrada.status, 201, JSON.stringify(registrada.body));
  assert.equal(registrada.body.usuario.rol, 'operador_campo');
  assert.ok(!registrada.body.usuario.clienteId);
  assert.equal((await request(`/planificacion/resumen?clienteId=${clientes.a}`, { token: registrada.body.token })).status, 400);
  assert.equal((await request('/usuarios', { token: registrada.body.token })).status, 403);
});

test('precipitacion HTTP persiste usuario/cliente del JWT y auditoria en una transaccion', async () => {
  const respuesta = await request('/precipitaciones', { usuario: 'operadorA', body: { ...lluvia(), clienteId: clientes.b, usuarioId: usuarios.operadorB.id } });
  assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body));
  const guardada = await prisma.precipitacionCampo.findUnique({ where: { id: respuesta.body.precipitacion.id } });
  assert.equal(guardada.clienteId, clientes.a);
  assert.equal(guardada.usuarioId, usuarios.operadorA.id);
  assert.equal(guardada.milimetros, 12.5);
  assert.equal(await prisma.auditoriaEvento.count({ where: { entidadId: guardada.id, clienteId: clientes.a, usuarioId: usuarios.operadorA.id } }), 1);
});

test('HTTP niega escrituras sobre otro cliente, campo no asignado y lote de otro campo sin crear datos', async () => {
  const antes = await prisma.precipitacionCampo.count();
  for (const body of [lluvia(campos.b, lotes.b), lluvia(campos.aNoAsignado, lotes.aNoAsignado), lluvia(campos.a, lotes.aNoAsignado)]) {
    assert.equal((await request('/precipitaciones', { usuario: 'operadorA', body })).status, 403);
  }
  assert.equal(await prisma.precipitacionCampo.count(), antes);
  assert.equal((await request('/precipitaciones', { usuario: 'sinCampos', body: lluvia() })).status, 403);
});

test('lecturas operativas y ficha respetan cliente y campos asignados', async () => {
  await request('/precipitaciones', { usuario: 'adminA', body: lluvia(campos.aNoAsignado, lotes.aNoAsignado) });
  await request('/precipitaciones', { usuario: 'operadorB', body: lluvia(campos.b, lotes.b) });
  const a = await request('/precipitaciones', { usuario: 'operadorA' });
  assert.equal(a.status, 200);
  assert.ok(a.body.precipitaciones.length > 0);
  assert.ok(a.body.precipitaciones.every((fila) => fila.clienteId === clientes.a && fila.campoAppId === campos.a.id));
  const sinCampos = await request('/precipitaciones', { usuario: 'sinCampos' });
  assert.deepEqual(sinCampos.body.precipitaciones, []);
  assert.equal((await request(`/operativo/lotes/${lotes.a}/ficha`, { usuario: 'operadorA' })).status, 200);
  assert.equal((await request(`/operativo/lotes/${lotes.aNoAsignado}/ficha`, { usuario: 'operadorA' })).status, 403);
  const ajeno = await request(`/operativo/lotes/${lotes.b}/ficha`, { usuario: 'operadorA' });
  assert.ok([403, 404].includes(ajeno.status));
});

test('sincronizacion HTTP procesa errores parciales y reintentos sin duplicar registros ni auditoria', async () => {
  const registros = [
    { id: 'mobile-lluvia-1', tipo: 'precipitacion', payload: lluvia() },
    { id: 'mobile-observacion-1', tipo: 'observacion', payload: observacion() },
    { id: 'mobile-ajeno', tipo: 'observacion', payload: observacion(campos.b, lotes.b) },
  ];
  for (let intento = 0; intento < 2; intento += 1) {
    const respuesta = await request('/sincronizacion', { usuario: 'operadorA', body: { registros } });
    assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body));
    assert.equal(respuesta.body.resultado.sincronizados, 2);
    assert.equal(respuesta.body.resultado.pendientes, 1);
    assert.equal(respuesta.body.resultado.registros[2].sincronizado, false);
  }
  assert.equal(await prisma.precipitacionCampo.count({ where: { registroMovilId: 'mobile-lluvia-1' } }), 1);
  const obs = await prisma.observacionCampo.findMany({ where: { registroMovilId: 'mobile-observacion-1' } });
  assert.equal(obs.length, 1);
  assert.equal(await prisma.auditoriaEvento.count({ where: { entidadId: obs[0].id, accion: 'crear' } }), 1);
  assert.equal(await prisma.observacionCampo.count({ where: { registroMovilId: 'mobile-ajeno' } }), 0);
});

test('dos envios offline simultaneos conservan unicidad y permiten confirmar con un reintento', async () => {
  const body = { registros: [{ id: 'mobile-concurrente', tipo: 'precipitacion', payload: lluvia() }] };
  const respuestas = await Promise.all([request('/sincronizacion', { usuario: 'operadorA', body }), request('/sincronizacion', { usuario: 'operadorA', body })]);
  assert.ok(respuestas.every((respuesta) => respuesta.status === 200));
  assert.ok(respuestas.some((respuesta) => respuesta.body.resultado.sincronizados === 1));
  const reintento = await request('/sincronizacion', { usuario: 'operadorA', body });
  assert.equal(reintento.body.resultado.sincronizados, 1);
  const guardadas = await prisma.precipitacionCampo.findMany({ where: { registroMovilId: 'mobile-concurrente' } });
  assert.equal(guardadas.length, 1);
  assert.equal(await prisma.auditoriaEvento.count({ where: { entidadId: guardadas[0].id } }), 1);
});

test('recorrida HTTP se crea, recibe observacion, se consulta y se cierra con auditoria', async () => {
  const creada = await request('/recorridas', { usuario: 'operadorA', body: {
    campoAppId: campos.a.id, loteAppId: lotes.a, titulo: 'Recorrida ficticia', fechaInicio: fecha, origen: 'mobile',
  } });
  assert.equal(creada.status, 201, JSON.stringify(creada.body));
  const id = creada.body.recorrida.id;
  assert.equal((await request('/observaciones', { usuario: 'operadorA', body: { ...observacion(), recorridaId: id } })).status, 201);
  const detalle = await request(`/recorridas/${id}`, { usuario: 'operadorA' });
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.observaciones.length, 1);
  assert.ok([403, 404].includes((await request(`/recorridas/${id}`, { usuario: 'operadorB' })).status));
  assert.equal((await request(`/recorridas/${id}/cerrar`, { usuario: 'operadorA', body: {} })).status, 400);
  const cerrada = await request(`/recorridas/${id}/cerrar`, { usuario: 'operadorA', body: { fechaCierre: '2026-11-06T13:00:00Z', origen: 'mobile' } });
  assert.equal(cerrada.status, 200, JSON.stringify(cerrada.body));
  assert.equal(cerrada.body.recorrida.estado, 'cerrada');
  assert.equal((await request(`/recorridas/${id}/cerrar`, { usuario: 'operadorA', body: { origen: 'mobile' } })).status, 400);
  assert.ok(await prisma.auditoriaEvento.count({ where: { entidadId: id } }) >= 2);
});

test('auditoria y listado de usuarios no aceptan cambiar cliente con querystring', async () => {
  const respuesta = await request(`/auditoria?clienteId=${clientes.b}`, { usuario: 'adminA' });
  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.body.eventos.length > 0);
  assert.ok(respuesta.body.eventos.every((evento) => evento.clienteId === clientes.a));
  const listado = await request('/usuarios', { usuario: 'adminA' });
  assert.equal(listado.status, 200);
  assert.ok(!JSON.stringify(listado.body).includes(usuarios.adminB.email));
});

test('administrador de un cliente no puede consultar ni editar rutas administrativas de otro cliente', async () => {
  assert.equal((await request(`/admin/asignaciones/${clientes.a}/usuarios/${usuarios.operadorA.id}/campos`, { usuario: 'adminA' })).status, 200);
  const rutas = [
    `/admin/integracion-erp/${clientes.b}`,
    `/admin/empresas-erp/${clientes.b}/empresas`,
    `/admin/asignaciones/${clientes.b}/usuarios/${usuarios.operadorB.id}/campos`,
  ];
  for (const ruta of rutas) {
    assert.equal((await request(ruta, { usuario: 'adminA' })).status, 403, ruta);
    assert.equal((await request(ruta, { usuario: 'adminA', method: 'PUT', body: {} })).status, 403, ruta);
  }
  for (const ruta of [`/admin/integracion-erp/${clientes.b}/probar`, `/admin/empresas-erp/${clientes.b}/importar`]) {
    assert.equal((await request(ruta, { usuario: 'adminA', body: {} })).status, 403);
  }
  assert.equal(await prisma.usuarioCampoErp.count({ where: { clienteId: clientes.b, usuarioId: usuarios.operadorB.id } }), 1);
});

test('planificacion HTTP guarda, aisla clientes, cierra con snapshot y bloquea edicion posterior', async () => {
  const planes = {};
  for (const letra of ['a', 'b']) {
    const id = `test-plan-${letra}`;
    const campo = campos[letra];
    const planificacion = {
      id, clienteId: clientes[letra], campaniaErpId: 'test-campania', nombre: `Plan ${letra}`, estado: 'borrador',
      lineas: [{
        id: `${id}-linea`, planificacionId: id, empresaErpId: campo.empresaErpId,
        campoAppId: campo.id, campoErpId: campo.campoErpId, loteAppId: lotes[letra], actividadAppId: `test-actividad-${letra}`,
        destinoVenta: 'Puerto ficticio', precioVentaEstimado: 200, hectareasPlanificadas: 10, rindeEstimado: 3,
        gastosComercialesEstimados: 50, costoProduccionEstimado: 100, ingresoBrutoEstimado: 6000,
        ingresoNetoEstimado: 5950, margenBrutoEstimado: 5850, estado: 'borrador',
      }],
    };
    planes[letra] = { planificacion, origen: 'web', motivo: 'Prueba de integracion' };
    const guardado = await request(`/planificacion/${id}`, { usuario: letra === 'a' ? 'adminA' : 'adminB', method: 'PUT', body: planes[letra] });
    assert.equal(guardado.status, 200, JSON.stringify(guardado.body));
  }
  for (const body of [planes.b, { ...planes.a, planificacion: { ...planes.a.planificacion, id: planes.b.planificacion.id } }]) {
    assert.equal((await request('/planificacion/test-plan-b', { usuario: 'adminA', method: 'PUT', body })).status, 403);
  }
  assert.equal((await request('/planificacion/test-plan-b/cerrar', { usuario: 'adminA', body: { motivo: 'No permitido', origen: 'web' } })).status, 403);
  assert.equal((await request('/planificacion/test-plan-b/snapshot', { usuario: 'adminA' })).status, 404);
  for (const cambios of [{ campoAppId: campos.b.id }, { actividadAppId: 'test-actividad-b' }]) {
    const body = { ...planes.a, planificacion: { ...planes.a.planificacion, lineas: [{ ...planes.a.planificacion.lineas[0], ...cambios }] } };
    assert.equal((await request('/planificacion/test-plan-a', { usuario: 'adminA', method: 'PUT', body })).status, 403);
  }
  const cerrada = await request('/planificacion/test-plan-a/cerrar', { usuario: 'adminA', body: { motivo: 'Cierre ficticio', origen: 'web' } });
  assert.equal(cerrada.status, 200, JSON.stringify(cerrada.body));
  const persistida = await prisma.planificacionAgricola.findUnique({ where: { id: 'test-plan-a' }, include: { lineas: true } });
  assert.equal(persistida.estado, 'cerrada');
  assert.equal(persistida.lineas[0].margenBrutoEstimado, 5850);
  assert.ok(persistida.lineas[0].padronesSnapshot);
  assert.equal((await request('/planificacion/test-plan-a', { usuario: 'adminA', method: 'PUT', body: planes.a })).status, 409);
  assert.ok(await prisma.auditoriaEvento.count({ where: { entidadId: 'test-plan-a' } }) >= 2);
});

test('ERP HTTP con proveedor mock usa permisos, historial y bloqueo PostgreSQL reales', async () => {
  assert.equal((await request('/erp/sincronizar', { usuario: 'operadorA', body: { items: ['monedas'] } })).status, 403);
  const respuesta = await request('/erp/sincronizar', { usuario: 'adminA', body: { items: ['monedas'] }, timeout: 120000 });
  assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body));
  assert.ok(respuesta.body.resultado.monedas > 0);
  const historial = await prisma.erpSincronizacion.findFirst({ where: { clienteId: clientes.a }, orderBy: { iniciadoEn: 'desc' } });
  assert.equal(historial.estado, 'completada');
  assert.deepEqual(historial.itemsSolicitados, ['monedas']);
  assert.equal(await prisma.erpSincronizacionBloqueo.count({ where: { clienteId: clientes.a } }), 0);
});
