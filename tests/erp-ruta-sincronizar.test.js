const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolverSincronizarErp,
} = require('../apps/api/dist/routes/erp');

function crearDeps(overrides = {}) {
  const llamadas = {
    iniciar: [],
    sincronizar: [],
    asegurar: [],
    finalizar: [],
    fallar: [],
  };
  const deps = {
    clientesEnProceso: new Set(),
    iniciarHistorial: async (clienteId, usuarioId, items) => {
      llamadas.iniciar.push({ clienteId, usuarioId, items });
      return { id: 'sync-1', itemsEjecutados: ['campos', 'lotes'] };
    },
    sincronizarSnapshot: async (clienteId, usuario, items) => {
      llamadas.sincronizar.push({ clienteId, usuario, items });
      return {
        campos: 2,
        lotes: 1,
        sincronizadoEn: '2026-10-04T12:00:00.000Z',
      };
    },
    asegurarPadrones: async (clienteId, tx) => {
      llamadas.asegurar.push({ clienteId, tx });
    },
    finalizarHistorial: async (sincronizacionId, clienteId, itemsEjecutados, resultado) => {
      llamadas.finalizar.push({ sincronizacionId, clienteId, itemsEjecutados, resultado });
    },
    fallarHistorial: async (sincronizacionId, error) => {
      llamadas.fallar.push({ sincronizacionId, error });
    },
    ...overrides,
  };

  return { deps, llamadas };
}

test('resolverSincronizarErp responde 400 si el usuario no tiene cliente', async () => {
  const { deps, llamadas } = crearDeps();

  const respuesta = await resolverSincronizarErp({ sub: 'usuario-1', rol: 'admin' }, { items: ['campos'] }, deps);

  assert.equal(respuesta.status, 400);
  assert.deepEqual(respuesta.body, { error: 'El usuario no tiene cliente asociado.' });
  assert.deepEqual(llamadas.iniciar, []);
  assert.deepEqual(llamadas.sincronizar, []);
});

test('resolverSincronizarErp responde 409 si ya hay una sincronizacion del cliente en curso', async () => {
  const { deps, llamadas } = crearDeps();
  deps.clientesEnProceso.add('cliente-1');

  const respuesta = await resolverSincronizarErp({ sub: 'usuario-1', clienteId: 'cliente-1' }, { items: ['campos'] }, deps);

  assert.equal(respuesta.status, 409);
  assert.deepEqual(respuesta.body, { error: 'Ya hay una sincronizacion en curso para este cliente.' });
  assert.deepEqual(llamadas.iniciar, []);
  assert.equal(deps.clientesEnProceso.has('cliente-1'), true);
});

test('resolverSincronizarErp inicia sincronizacion, asegura padrones y finaliza historial', async () => {
  const { deps, llamadas } = crearDeps();

  const respuesta = await resolverSincronizarErp({
    sub: 'usuario-1',
    clienteId: 'cliente-1',
  }, {
    items: ['campos', 'lotes'],
  }, deps);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.ok, true);
  assert.deepEqual(llamadas.iniciar, [{
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    items: ['campos', 'lotes'],
  }]);
  assert.deepEqual(llamadas.sincronizar, [{
    clienteId: 'cliente-1',
    usuario: { id: 'usuario-1', clienteId: 'cliente-1' },
    items: ['campos', 'lotes'],
  }]);
  assert.deepEqual(llamadas.asegurar, [{ clienteId: 'cliente-1', tx: null }]);
  assert.equal(llamadas.finalizar.length, 1);
  assert.equal(llamadas.finalizar[0].sincronizacionId, 'sync-1');
  assert.deepEqual(llamadas.finalizar[0].itemsEjecutados, ['campos', 'lotes']);
  assert.equal(llamadas.fallar.length, 0);
  assert.equal(deps.clientesEnProceso.has('cliente-1'), false);
});

test('resolverSincronizarErp marca historial fallido y libera lock si falla la sincronizacion', async () => {
  const error = new Error('ERP no disponible');
  const { deps, llamadas } = crearDeps({
    sincronizarSnapshot: async () => {
      throw error;
    },
  });

  await assert.rejects(
    () => resolverSincronizarErp({ sub: 'usuario-1', clienteId: 'cliente-1' }, { items: ['campos'] }, deps),
    /ERP no disponible/,
  );

  assert.equal(llamadas.iniciar.length, 1);
  assert.equal(llamadas.finalizar.length, 0);
  assert.equal(llamadas.fallar.length, 1);
  assert.equal(llamadas.fallar[0].sincronizacionId, 'sync-1');
  assert.equal(llamadas.fallar[0].error, error);
  assert.equal(deps.clientesEnProceso.has('cliente-1'), false);
});

test('resolverSincronizarErp libera lock aunque falle antes de crear historial', async () => {
  const error = new Error('No se pudo iniciar historial');
  const { deps, llamadas } = crearDeps({
    iniciarHistorial: async () => {
      throw error;
    },
  });

  await assert.rejects(
    () => resolverSincronizarErp({ sub: 'usuario-1', clienteId: 'cliente-1' }, { items: ['campos'] }, deps),
    /No se pudo iniciar historial/,
  );

  assert.equal(llamadas.sincronizar.length, 0);
  assert.equal(llamadas.fallar.length, 0);
  assert.equal(deps.clientesEnProceso.has('cliente-1'), false);
});
