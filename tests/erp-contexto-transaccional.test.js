const test = require('node:test');
const assert = require('node:assert/strict');
const { clienteConContextoErp, conTransaccionErp } = require('../apps/api/dist/services/erp/contextoTransaccional');
const { obtenerDuracionBloqueoErp } = require('../apps/api/dist/config/bloqueoErp');

test('contexto ERP mantiene otras requests fuera de la transaccion y une transacciones anidadas', async () => {
  const base = { leer: async () => 'base' };
  const proxy = clienteConContextoErp(base);
  const tx = { leer: async () => 'tx' };
  await Promise.all([
    conTransaccionErp(tx, async () => {
      await Promise.resolve();
      assert.equal(await proxy.leer(), 'tx');
      assert.equal(await proxy.$transaction((cliente) => cliente.leer()), 'tx');
      assert.deepEqual(await proxy.$transaction([proxy.leer(), proxy.leer()]), ['tx', 'tx']);
    }),
    (async () => { assert.equal(await proxy.leer(), 'base'); })(),
  ]);
  assert.equal(await proxy.leer(), 'base');
});

test('contexto ERP nunca vuelve al cliente global cuando la transaccion expira', async () => {
  const proxy = clienteConContextoErp({ leer: async () => 'NO USAR' });
  await conTransaccionErp({ leer: async () => { throw new Error('transaccion cerrada'); } }, async () => {
    await assert.rejects(proxy.leer(), /transaccion cerrada/);
  });
});

test('TTL ERP tiene default acotado y rechaza configuracion fuera de rango', () => {
  assert.equal(obtenerDuracionBloqueoErp({}), 300000);
  for (const valor of ['abc', '0', '9999', '3600001', '10000.5']) {
    assert.throws(() => obtenerDuracionBloqueoErp({ ERP_SYNC_LOCK_TTL_MS: valor }));
  }
  assert.equal(obtenerDuracionBloqueoErp({ ERP_SYNC_LOCK_TTL_MS: '10000' }), 10000);
});
