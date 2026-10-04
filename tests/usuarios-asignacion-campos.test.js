const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearAsignacionUsuarioCampo,
  reemplazarAsignacionesUsuarioConDeps,
} = require('../apps/api/dist/services/usuarios/asignacionCampos');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearInput(overrides = {}) {
  return {
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    camposErpIds: ['empresa:1:campo:1', 'empresa:1:campo:2'],
    ...overrides,
  };
}

function crearAsignacion(campoErpId = 'empresa:1:campo:1') {
  return {
    id: `asignacion-${campoErpId}`,
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoErpId,
    asignadoPor: 'admin-1',
    createdAt: fechaBase.toISOString(),
  };
}

function crearTx() {
  const executeRaw = [];

  return {
    executeRaw,
    tx: {
      $executeRaw: async (strings, ...values) => {
        executeRaw.push({ sql: strings.join('?'), values });
        return { count: 1 };
      },
    },
  };
}

function crearDeps(overrides = {}) {
  const llamadas = {
    buscarUsuario: [],
    listarEmpresasCliente: [],
    listarCamposValidos: [],
    listarAsignaciones: [],
    registrarAuditoria: [],
    transacciones: 0,
    ids: 0,
  };
  const { tx, executeRaw } = crearTx();

  const deps = {
    llamadas,
    executeRaw,
    buscarUsuario: async (usuarioId) => {
      llamadas.buscarUsuario.push(usuarioId);
      return { clienteId: 'cliente-1' };
    },
    listarEmpresasCliente: async (clienteId) => {
      llamadas.listarEmpresasCliente.push(clienteId);
      return [{ empresaErpId: 'empresa-1' }];
    },
    listarCamposValidos: async (camposErpIds, empresasErpIds) => {
      llamadas.listarCamposValidos.push({ camposErpIds, empresasErpIds });
      return camposErpIds.map((erpId) => ({ erpId }));
    },
    listarAsignaciones: async (clienteId, usuarioId) => {
      llamadas.listarAsignaciones.push({ clienteId, usuarioId });
      return [crearAsignacion('empresa:1:campo:anterior')];
    },
    ejecutarTransaccion: async (callback) => {
      llamadas.transacciones += 1;
      return callback(tx);
    },
    registrarAuditoria: async (_tx, datos) => {
      llamadas.registrarAuditoria.push(datos);
    },
    generarId: () => {
      llamadas.ids += 1;
      return `uuid-${llamadas.ids}`;
    },
  };

  return { ...deps, ...overrides, llamadas, executeRaw };
}

async function capturarErrorAsync(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }

  throw new Error('Se esperaba que la funcion lanzara un error.');
}

test('mapearAsignacionUsuarioCampo serializa asignacion y omite asignadoPor nulo', () => {
  assert.deepEqual(mapearAsignacionUsuarioCampo({
    id: 'asignacion-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoErpId: 'empresa:1:campo:1',
    asignadoPor: null,
    createdAt: fechaBase,
  }), {
    id: 'asignacion-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoErpId: 'empresa:1:campo:1',
    asignadoPor: undefined,
    createdAt: fechaBase.toISOString(),
  });
});

test('reemplazarAsignacionesUsuarioConDeps rechaza usuario inexistente o de otro cliente', async () => {
  const deps = crearDeps({
    buscarUsuario: async (usuarioId) => {
      deps.llamadas.buscarUsuario.push(usuarioId);
      return { clienteId: 'cliente-2' };
    },
  });

  const error = await capturarErrorAsync(
    () => reemplazarAsignacionesUsuarioConDeps(crearInput(), 'admin-1', deps),
  );

  assert.match(error.message, /no pertenece/);
  assert.equal(error.statusCode, 403);
  assert.equal(deps.llamadas.transacciones, 0);
  assert.deepEqual(deps.llamadas.registrarAuditoria, []);
});

test('reemplazarAsignacionesUsuarioConDeps rechaza campos fuera del cliente', async () => {
  const deps = crearDeps({
    listarCamposValidos: async (camposErpIds, empresasErpIds) => {
      deps.llamadas.listarCamposValidos.push({ camposErpIds, empresasErpIds });
      return [{ erpId: 'empresa:1:campo:1' }];
    },
  });

  const error = await capturarErrorAsync(
    () => reemplazarAsignacionesUsuarioConDeps(crearInput(), 'admin-1', deps),
  );

  assert.match(error.message, /no pertenecen al cliente/);
  assert.equal(error.statusCode, 403);
  assert.deepEqual(deps.llamadas.listarEmpresasCliente, ['cliente-1']);
  assert.equal(deps.llamadas.transacciones, 0);
  assert.deepEqual(deps.llamadas.registrarAuditoria, []);
});

test('reemplazarAsignacionesUsuarioConDeps permite vaciar asignaciones y audita', async () => {
  const deps = crearDeps({
    listarAsignaciones: async (clienteId, usuarioId) => {
      deps.llamadas.listarAsignaciones.push({ clienteId, usuarioId });
      return [];
    },
  });

  const resultado = await reemplazarAsignacionesUsuarioConDeps(
    crearInput({ camposErpIds: [] }),
    undefined,
    deps,
  );

  assert.deepEqual(resultado, []);
  assert.deepEqual(deps.llamadas.listarEmpresasCliente, []);
  assert.equal(deps.llamadas.transacciones, 1);
  assert.equal(deps.executeRaw.length, 1);
  assert.equal(deps.llamadas.registrarAuditoria.length, 1);
  assert.equal(deps.llamadas.registrarAuditoria[0].accion, 'reemplazar_asignaciones');
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].valoresDespues, []);
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].metadata, { camposAsignados: 0 });
});

test('reemplazarAsignacionesUsuarioConDeps reemplaza campos validos dentro de transaccion', async () => {
  const deps = crearDeps({
    listarAsignaciones: async (clienteId, usuarioId) => {
      deps.llamadas.listarAsignaciones.push({ clienteId, usuarioId });
      return deps.llamadas.listarAsignaciones.length === 1
        ? [crearAsignacion('empresa:1:campo:anterior')]
        : [crearAsignacion('empresa:1:campo:1'), crearAsignacion('empresa:1:campo:2')];
    },
  });

  const resultado = await reemplazarAsignacionesUsuarioConDeps(crearInput(), 'admin-1', deps);

  assert.deepEqual(resultado.map((asignacion) => asignacion.campoErpId), ['empresa:1:campo:1', 'empresa:1:campo:2']);
  assert.equal(deps.llamadas.transacciones, 1);
  assert.equal(deps.executeRaw.length, 3);
  assert.deepEqual(deps.executeRaw[1].values, ['uuid-1', 'cliente-1', 'usuario-1', 'empresa:1:campo:1', 'admin-1']);
  assert.deepEqual(deps.executeRaw[2].values, ['uuid-2', 'cliente-1', 'usuario-1', 'empresa:1:campo:2', 'admin-1']);
  assert.equal(deps.llamadas.registrarAuditoria.length, 1);
  assert.equal(deps.llamadas.registrarAuditoria[0].clienteId, 'cliente-1');
  assert.equal(deps.llamadas.registrarAuditoria[0].usuario.id, 'admin-1');
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].valoresAntes.map((asignacion) => asignacion.campoErpId), ['empresa:1:campo:anterior']);
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].valoresDespues, ['empresa:1:campo:1', 'empresa:1:campo:2']);
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].metadata, { camposAsignados: 2 });
});
