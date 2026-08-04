const test = require('node:test');
const assert = require('node:assert/strict');
const { procesarSincronizacion } = require('../apps/api/src/services/sincronizacionOffline');

test('procesarSincronizacion marca registros como sincronizados y devuelve el resumen', () => {
  const registros = [
    { id: '1', tipo: 'registro-campo', payload: { lote: 'Lote 1' }, sincronizado: false },
    { id: '2', tipo: 'registro-campo', payload: { lote: 'Lote 2' }, sincronizado: false },
  ];

  const resultado = procesarSincronizacion(registros);

  assert.equal(resultado.sincronizados, 2);
  assert.equal(resultado.pendientes, 0);
  assert.ok(resultado.registros.every((item) => item.sincronizado));
});
