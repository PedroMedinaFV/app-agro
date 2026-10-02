const test = require('node:test');
const assert = require('node:assert/strict');
const { procesarSincronizacion } = require('../apps/api/dist/services/sincronizacionOffline');

test('procesarSincronizacion deja pendiente un tipo no soportado sin marcarlo como sincronizado', async () => {
  const registros = [
    { id: '1', tipo: 'registro-campo', payload: { lote: 'Lote 1' }, sincronizado: false },
  ];

  const resultado = await procesarSincronizacion(registros, { id: 'usuario-1', rol: 'operador_campo', clienteId: 'cliente-1' });

  assert.equal(resultado.sincronizados, 0);
  assert.equal(resultado.pendientes, 1);
  assert.equal(resultado.registros[0].sincronizado, false);
  assert.equal(resultado.registros[0].error, 'Tipo de registro no soportado: registro-campo');
});

test('procesarSincronizacion deja pendiente una observacion con payload invalido', async () => {
  const registros = [
    {
      id: 'obs-1',
      tipo: 'observacion',
      payload: {
        campoAppId: 'campo-1',
        titulo: 'Mancha en cultivo',
      },
      sincronizado: false,
    },
  ];

  const resultado = await procesarSincronizacion(registros, { id: 'usuario-1', rol: 'operador_campo', clienteId: 'cliente-1' });

  assert.equal(resultado.sincronizados, 0);
  assert.equal(resultado.pendientes, 1);
  assert.equal(resultado.registros[0].sincronizado, false);
  assert.equal(resultado.registros[0].error, 'Payload de observacion invalido.');
});
