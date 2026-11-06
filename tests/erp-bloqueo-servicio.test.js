const test = require('node:test');
const assert = require('node:assert/strict');
const { crearBloqueoSincronizacionErp } = require('../apps/api/dist/services/erp/bloqueoSincronizacionErp');
const { prisma } = require('../apps/api/dist/prisma');
const reserva = { clienteId: 'c1', token: 'token-1', id: 'historial-1', ttl: 300000, itemsEjecutados: ['campos'] };

function base(filas) {
  const consultas = [];
  const escrituras = [];
  const tx = {
    $queryRaw: async (sql, ...valores) => { consultas.push({ sql: sql.join('?'), valores }); return filas.shift(); },
    $executeRaw: async (sql, ...valores) => { escrituras.push({ sql: sql.join('?'), valores }); return 1; },
  };
  const db = { ...tx, $transaction: async (tarea) => tarea(tx) };
  return { bloqueo: crearBloqueoSincronizacionErp(db), consultas, escrituras };
}

test('bloqueo no crea historial si la puerta o reserva del cliente esta ocupada', async () => {
  for (const filas of [[[ { obtenida: false } ]], [[{ obtenida: true }], [{ vigente: true }]]]) {
    const { bloqueo, escrituras } = base(filas);
    assert.equal(await bloqueo.adquirir('c1', 'u1', ['campos']), null);
    assert.equal(escrituras.length, 0);
  }
});

test('bloqueo recupera historial interrumpido y crea reserva con token distinto', async () => {
  const { bloqueo, escrituras } = base([[{ obtenida: true }], [{ vigente: false, sincronizacionId: 'anterior' }], [{ id: 'nueva' }]]);
  const nueva = await bloqueo.adquirir('c1', 'u1', ['campos']);
  assert.equal(nueva.id, 'nueva');
  assert.equal(nueva.clienteId, 'c1');
  assert.match(nueva.token, /^[a-f0-9-]{36}$/);
  assert.ok(escrituras[0].valores.includes('anterior'));
  assert.match(escrituras[0].sql, /"estado" = 'en_proceso'/);
});

test('bloqueo rechazado o vencido nunca ejecuta las escrituras del trabajo', async () => {
  const casos = [ [[{ obtenida: false }]], [[{ obtenida: true }], [{ obtenida: false }]],
    [[{ obtenida: true }], [{ obtenida: true }], []],
    [[{ obtenida: true }], [{ obtenida: true }], [{ vigente: false }]], ];
  for (const filas of casos) {
    const { bloqueo } = base(filas);
    let ejecutado = false;
    await assert.rejects(bloqueo.ejecutar(reserva, async () => { ejecutado = true; }), { statusCode: 409 });
    assert.equal(ejecutado, false);
  }
});

test('bloqueo liga queries indirectas al cliente protegido y comprueba vigencia antes del commit', async () => {
  const { bloqueo, escrituras } = base([[{ obtenida: true }], [{ obtenida: true }], [{ vigente: true }], [{ vigente: false }]]);
  await assert.rejects(bloqueo.ejecutar(reserva, async () => {
    await prisma.$executeRaw`SELECT 1`;
  }), { statusCode: 409 });
  assert.equal(escrituras.length, 1);
});

test('liberacion condiciona por cliente, token e historial para no borrar una reserva nueva', async () => {
  const { bloqueo, escrituras } = base([]);
  await bloqueo.liberar(reserva);
  assert.deepEqual(escrituras[0].valores, ['c1', 'token-1', 'historial-1']);
  assert.match(escrituras[0].sql, /"token" =/);
  assert.match(escrituras[0].sql, /"sincronizacionId" =/);
});
