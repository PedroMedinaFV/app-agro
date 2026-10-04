const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'secret-auth-microsoft-test';

const jwt = require('../apps/api/node_modules/jsonwebtoken');
const { resolverLoginMicrosoft } = require('../apps/api/dist/routes/auth');

function crearDeps(overrides = {}) {
  const llamadas = {
    validarIdToken: [],
    buscarUsuarioPorEmail: [],
    actualizarUsuarioMicrosoft: [],
  };

  const deps = {
    llamadas,
    validarIdToken: async (idToken) => {
      llamadas.validarIdToken.push(idToken);
      return {
        microsoftId: 'tenant-1:sub-1',
        email: ' Usuario@AgroApp.Local ',
        nombre: 'Usuario Microsoft',
      };
    },
    buscarUsuarioPorEmail: async (email) => {
      llamadas.buscarUsuarioPorEmail.push(email);
      return {
        id: 'usuario-1',
        email,
        nombre: 'Nombre anterior',
        rol: 'admin',
        clienteId: 'cliente-1',
        microsoftId: null,
      };
    },
    actualizarUsuarioMicrosoft: async (input) => {
      llamadas.actualizarUsuarioMicrosoft.push(input);
      return {
        id: input.id,
        email: 'usuario@agroapp.local',
        nombre: input.nombre,
        rol: 'admin',
        clienteId: 'cliente-1',
        microsoftId: input.microsoftId,
      };
    },
  };

  return { ...deps, ...overrides, llamadas };
}

test('resolverLoginMicrosoft responde 400 si falta idToken', async () => {
  const deps = crearDeps();

  const respuesta = await resolverLoginMicrosoft(undefined, deps);

  assert.equal(respuesta.status, 400);
  assert.match(respuesta.body.error, /Falta idToken/);
  assert.deepEqual(deps.llamadas.validarIdToken, []);
  assert.deepEqual(deps.llamadas.buscarUsuarioPorEmail, []);
});

test('resolverLoginMicrosoft normaliza email y rechaza usuarios no habilitados', async () => {
  const deps = crearDeps({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return null;
    },
  });

  const respuesta = await resolverLoginMicrosoft('id-token', deps);

  assert.equal(respuesta.status, 403);
  assert.match(respuesta.body.error, /no esta habilitado/);
  assert.deepEqual(deps.llamadas.buscarUsuarioPorEmail, ['usuario@agroapp.local']);
  assert.deepEqual(deps.llamadas.actualizarUsuarioMicrosoft, []);
});

test('resolverLoginMicrosoft rechaza usuario existente sin cliente asociado', async () => {
  const deps = crearDeps({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return {
        id: 'usuario-1',
        email,
        nombre: 'Usuario sin cliente',
        rol: 'admin',
        clienteId: null,
        microsoftId: null,
      };
    },
  });

  const respuesta = await resolverLoginMicrosoft('id-token', deps);

  assert.equal(respuesta.status, 403);
  assert.match(respuesta.body.error, /no esta habilitado/);
  assert.deepEqual(deps.llamadas.actualizarUsuarioMicrosoft, []);
});

test('resolverLoginMicrosoft rechaza email enlazado a otra identidad Microsoft', async () => {
  const deps = crearDeps({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return {
        id: 'usuario-1',
        email,
        nombre: 'Usuario existente',
        rol: 'admin',
        clienteId: 'cliente-1',
        microsoftId: 'tenant-otro:sub-otro',
      };
    },
  });

  const respuesta = await resolverLoginMicrosoft('id-token', deps);

  assert.equal(respuesta.status, 403);
  assert.match(respuesta.body.error, /otra identidad Microsoft/);
  assert.deepEqual(deps.llamadas.actualizarUsuarioMicrosoft, []);
});

test('resolverLoginMicrosoft actualiza identidad y devuelve token con permisos', async () => {
  const deps = crearDeps();

  const respuesta = await resolverLoginMicrosoft('id-token', deps);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.mensaje, 'Login Microsoft correcto');
  assert.equal(respuesta.body.origen, 'microsoft');
  assert.equal(respuesta.body.usuario.id, 'usuario-1');
  assert.equal(respuesta.body.usuario.email, 'usuario@agroapp.local');
  assert.equal(respuesta.body.usuario.nombre, 'Usuario Microsoft');
  assert.equal(respuesta.body.usuario.rol, 'admin');
  assert.equal(respuesta.body.usuario.clienteId, 'cliente-1');
  assert.ok(respuesta.body.permisos.includes('usuarios:gestionar'));
  assert.deepEqual(deps.llamadas.actualizarUsuarioMicrosoft, [{
    id: 'usuario-1',
    nombre: 'Usuario Microsoft',
    microsoftId: 'tenant-1:sub-1',
  }]);

  const payload = jwt.verify(respuesta.body.token, process.env.JWT_SECRET || 'secret-dev');
  assert.equal(payload.sub, 'usuario-1');
  assert.equal(payload.email, 'usuario@agroapp.local');
  assert.equal(payload.rol, 'admin');
  assert.equal(payload.clienteId, 'cliente-1');
});

test('resolverLoginMicrosoft propaga errores del validador de Microsoft', async () => {
  const error = new Error('Token Microsoft invalido.');
  const deps = crearDeps({
    validarIdToken: async (idToken) => {
      deps.llamadas.validarIdToken.push(idToken);
      throw error;
    },
  });

  await assert.rejects(
    () => resolverLoginMicrosoft('id-token', deps),
    /Token Microsoft invalido/,
  );

  assert.deepEqual(deps.llamadas.buscarUsuarioPorEmail, []);
  assert.deepEqual(deps.llamadas.actualizarUsuarioMicrosoft, []);
});
