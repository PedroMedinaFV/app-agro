const test = require('node:test');
const assert = require('node:assert/strict');
const {
  guardarUsuarioAdminEnTransaccion,
  mapearUsuarioAdmin,
} = require('../apps/api/dist/services/usuarios/usuariosAdminPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearRow(overrides = {}) {
  return {
    id: 'usuario-1',
    email: 'usuario@agroapp.local',
    nombre: 'Usuario Agro',
    rol: 'operador_campo',
    clienteId: 'cliente-1',
    microsoftId: null,
    tienePassword: true,
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
}

function crearRequest(overrides = {}) {
  return {
    email: ' Nuevo@AgroApp.Local ',
    nombre: ' Nuevo   Usuario ',
    rol: 'admin',
    passwordTemporal: ' temporal123 ',
    ...overrides,
  };
}

function crearTx({ existente = null, duplicado = null, guardado } = {}) {
  const consultas = [];
  const upserts = [];
  const tx = {
    $queryRaw: async (strings, ...values) => {
      consultas.push({ sql: strings.join('?'), values });
      return consultas.length === 1
        ? (existente ? [existente] : [])
        : (duplicado ? [duplicado] : []);
    },
    usuario: {
      upsert: async (args) => {
        upserts.push(args);
        return guardado || {
          id: args.where.id,
          email: args.create.email,
          nombre: args.create.nombre,
          rol: args.create.rol,
          clienteId: args.create.clienteId,
          microsoftId: null,
          password: args.create.password,
          createdAt: fechaBase,
          updatedAt: fechaBase,
        };
      },
    },
  };

  return { tx, consultas, upserts };
}

function crearDeps(overrides = {}) {
  const llamadas = {
    hashPassword: [],
    listarAsignaciones: [],
    registrarAuditoria: [],
  };

  const deps = {
    llamadas,
    hashPassword: async (password) => {
      llamadas.hashPassword.push(password);
      return 'hash-temporal';
    },
    listarAsignaciones: async (clienteId, usuarioId) => {
      llamadas.listarAsignaciones.push({ clienteId, usuarioId });
      return [{
        id: 'asignacion-1',
        clienteId,
        usuarioId,
        campoErpId: 'empresa:1:campo:1',
        createdAt: fechaBase.toISOString(),
      }];
    },
    registrarAuditoria: async (_tx, datos) => {
      llamadas.registrarAuditoria.push(datos);
    },
  };

  return { ...deps, ...overrides, llamadas };
}

async function capturarErrorAsync(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }

  throw new Error('Se esperaba que la funcion lanzara un error.');
}

test('mapearUsuarioAdmin serializa usuario y campos asignados', async () => {
  const deps = crearDeps();

  const usuario = await mapearUsuarioAdmin(crearRow(), deps);

  assert.equal(usuario.id, 'usuario-1');
  assert.equal(usuario.email, 'usuario@agroapp.local');
  assert.equal(usuario.rol, 'operador_campo');
  assert.equal(usuario.clienteId, 'cliente-1');
  assert.equal(usuario.tienePassword, true);
  assert.deepEqual(usuario.camposAsignados, ['empresa:1:campo:1']);
  assert.equal(usuario.createdAt, fechaBase.toISOString());
  assert.deepEqual(deps.llamadas.listarAsignaciones, [{ clienteId: 'cliente-1', usuarioId: 'usuario-1' }]);
});

test('guardarUsuarioAdminEnTransaccion exige sesion con cliente', async () => {
  const { tx, consultas, upserts } = crearTx();
  const deps = crearDeps();

  await assert.rejects(
    () => guardarUsuarioAdminEnTransaccion(tx, 'usuario-1', crearRequest(), { id: 'admin-1' }, deps),
    /Sesion sin cliente/,
  );

  assert.equal(consultas.length, 0);
  assert.equal(upserts.length, 0);
  assert.deepEqual(deps.llamadas.hashPassword, []);
  assert.deepEqual(deps.llamadas.registrarAuditoria, []);
});

test('guardarUsuarioAdminEnTransaccion bloquea modificar usuario de otro cliente', async () => {
  const { tx, upserts } = crearTx({ existente: crearRow({ clienteId: 'cliente-2' }) });
  const deps = crearDeps();

  const error = await capturarErrorAsync(
    () => guardarUsuarioAdminEnTransaccion(tx, 'usuario-1', crearRequest(), { id: 'admin-1', clienteId: 'cliente-1' }, deps),
  );

  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
  assert.equal(upserts.length, 0);
  assert.deepEqual(deps.llamadas.hashPassword, []);
  assert.deepEqual(deps.llamadas.registrarAuditoria, []);
});

test('guardarUsuarioAdminEnTransaccion rechaza email duplicado antes de hashear', async () => {
  const { tx, upserts } = crearTx({ duplicado: crearRow({ id: 'usuario-2', email: 'nuevo@agroapp.local' }) });
  const deps = crearDeps();

  const error = await capturarErrorAsync(
    () => guardarUsuarioAdminEnTransaccion(tx, 'usuario-1', crearRequest(), { id: 'admin-1', clienteId: 'cliente-1' }, deps),
  );

  assert.match(error.message, /Ya existe un usuario/);
  assert.equal(error.statusCode, 409);
  assert.equal(upserts.length, 0);
  assert.deepEqual(deps.llamadas.hashPassword, []);
  assert.deepEqual(deps.llamadas.registrarAuditoria, []);
});

test('guardarUsuarioAdminEnTransaccion crea usuario, hashea password temporal y audita', async () => {
  const { tx, upserts } = crearTx();
  const deps = crearDeps();

  const respuesta = await guardarUsuarioAdminEnTransaccion(
    tx,
    'usuario-1',
    crearRequest(),
    { id: 'admin-1', email: 'admin@agroapp.local', clienteId: 'cliente-1' },
    deps,
  );

  assert.equal(respuesta.mensaje, 'Usuario creado con auditoria.');
  assert.equal(respuesta.auditado, true);
  assert.equal(respuesta.usuario.email, 'nuevo@agroapp.local');
  assert.equal(respuesta.usuario.nombre, 'Nuevo Usuario');
  assert.equal(respuesta.usuario.rol, 'admin');
  assert.deepEqual(deps.llamadas.hashPassword, ['temporal123']);
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].create.password, 'hash-temporal');
  assert.equal(upserts[0].create.clienteId, 'cliente-1');
  assert.equal(deps.llamadas.registrarAuditoria.length, 1);
  assert.equal(deps.llamadas.registrarAuditoria[0].accion, 'crear');
  assert.equal(deps.llamadas.registrarAuditoria[0].valoresAntes, undefined);
  assert.equal(deps.llamadas.registrarAuditoria[0].valoresDespues.email, 'nuevo@agroapp.local');
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].metadata, {
    email: 'admin@agroapp.local',
    passwordTemporalActualizada: true,
  });
});

test('guardarUsuarioAdminEnTransaccion actualiza usuario sin pisar password si no hay temporal', async () => {
  const existente = crearRow({ rol: 'operador_campo', email: 'viejo@agroapp.local' });
  const { tx, upserts } = crearTx({
    existente,
    guardado: {
      ...existente,
      email: 'nuevo@agroapp.local',
      nombre: 'Nuevo Usuario',
      rol: 'planificador',
      password: 'hash-anterior',
    },
  });
  const deps = crearDeps();

  const respuesta = await guardarUsuarioAdminEnTransaccion(
    tx,
    'usuario-1',
    crearRequest({ rol: 'planificador', passwordTemporal: undefined }),
    { id: 'admin-1', clienteId: 'cliente-1' },
    deps,
  );

  assert.equal(respuesta.mensaje, 'Usuario actualizado con auditoria.');
  assert.equal(respuesta.usuario.rol, 'planificador');
  assert.deepEqual(deps.llamadas.hashPassword, []);
  assert.equal('password' in upserts[0].update, false);
  assert.equal(deps.llamadas.registrarAuditoria.length, 1);
  assert.equal(deps.llamadas.registrarAuditoria[0].accion, 'actualizar');
  assert.equal(deps.llamadas.registrarAuditoria[0].valoresAntes.email, 'viejo@agroapp.local');
  assert.equal(deps.llamadas.registrarAuditoria[0].valoresDespues.email, 'nuevo@agroapp.local');
  assert.deepEqual(deps.llamadas.registrarAuditoria[0].metadata, {
    passwordTemporalActualizada: false,
  });
});
