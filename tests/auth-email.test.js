const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'secret-auth-email-test';

const jwt = require('../apps/api/node_modules/jsonwebtoken');
const {
  resolverRegistroEmail,
  resolverLoginEmail,
} = require('../apps/api/dist/routes/auth');

function usuarioBase(overrides = {}) {
  return {
    id: 'usuario-1',
    email: 'usuario@agroapp.local',
    nombre: 'Usuario Agro',
    rol: 'admin',
    clienteId: 'cliente-1',
    password: 'hash-password',
    ...overrides,
  };
}

function crearDepsRegistro(overrides = {}) {
  const llamadas = {
    buscarUsuarioPorEmail: [],
    hashPassword: [],
    crearUsuarioEmail: [],
  };

  const deps = {
    llamadas,
    buscarUsuarioPorEmail: async (email) => {
      llamadas.buscarUsuarioPorEmail.push(email);
      return null;
    },
    hashPassword: async (password) => {
      llamadas.hashPassword.push(password);
      return 'hash-generado';
    },
    crearUsuarioEmail: async (input) => {
      llamadas.crearUsuarioEmail.push(input);
      return usuarioBase({
        email: input.email,
        nombre: input.nombre,
        password: input.password,
      });
    },
  };

  return { ...deps, ...overrides, llamadas };
}

function crearDepsLogin(overrides = {}) {
  const llamadas = {
    buscarUsuarioPorEmail: [],
    compararPassword: [],
  };

  const deps = {
    llamadas,
    buscarUsuarioPorEmail: async (email) => {
      llamadas.buscarUsuarioPorEmail.push(email);
      return usuarioBase();
    },
    compararPassword: async (password, passwordHash) => {
      llamadas.compararPassword.push({ password, passwordHash });
      return true;
    },
  };

  return { ...deps, ...overrides, llamadas };
}

test('resolverRegistroEmail rechaza correo ya registrado sin hashear password', async () => {
  const deps = crearDepsRegistro({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return usuarioBase({ email });
    },
  });

  const respuesta = await resolverRegistroEmail({
    email: 'usuario@agroapp.local',
    nombre: 'Usuario',
    password: 'password-plano',
  }, deps);

  assert.equal(respuesta.status, 400);
  assert.match(respuesta.body.error, /correo ya est/);
  assert.deepEqual(deps.llamadas.hashPassword, []);
  assert.deepEqual(deps.llamadas.crearUsuarioEmail, []);
});

test('resolverRegistroEmail crea usuario, emite token y permisos', async () => {
  const deps = crearDepsRegistro();

  const respuesta = await resolverRegistroEmail({
    email: 'nuevo@agroapp.local',
    nombre: 'Nuevo Usuario',
    password: 'password-plano',
  }, deps);

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.mensaje, 'Usuario creado');
  assert.equal(respuesta.body.origen, 'email');
  assert.equal(respuesta.body.usuario.email, 'nuevo@agroapp.local');
  assert.equal(respuesta.body.usuario.nombre, 'Nuevo Usuario');
  assert.ok(respuesta.body.permisos.includes('usuarios:gestionar'));
  assert.deepEqual(deps.llamadas.hashPassword, ['password-plano']);
  assert.deepEqual(deps.llamadas.crearUsuarioEmail, [{
    email: 'nuevo@agroapp.local',
    nombre: 'Nuevo Usuario',
    password: 'hash-generado',
  }]);

  const payload = jwt.verify(respuesta.body.token, process.env.JWT_SECRET || 'secret-dev');
  assert.equal(payload.sub, 'usuario-1');
  assert.equal(payload.email, 'nuevo@agroapp.local');
  assert.equal(payload.rol, 'admin');
  assert.equal(payload.clienteId, 'cliente-1');
});

test('resolverLoginEmail rechaza usuario inexistente sin comparar password', async () => {
  const deps = crearDepsLogin({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return null;
    },
  });

  const respuesta = await resolverLoginEmail({
    email: 'inexistente@agroapp.local',
    password: 'password-plano',
  }, deps);

  assert.equal(respuesta.status, 401);
  assert.match(respuesta.body.error, /Credenciales/);
  assert.deepEqual(deps.llamadas.compararPassword, []);
});

test('resolverLoginEmail rechaza cuenta Microsoft sin password local', async () => {
  const deps = crearDepsLogin({
    buscarUsuarioPorEmail: async (email) => {
      deps.llamadas.buscarUsuarioPorEmail.push(email);
      return usuarioBase({ email, password: null });
    },
  });

  const respuesta = await resolverLoginEmail({
    email: 'microsoft@agroapp.local',
    password: 'password-plano',
  }, deps);

  assert.equal(respuesta.status, 401);
  assert.match(respuesta.body.error, /Microsoft/);
  assert.deepEqual(deps.llamadas.compararPassword, []);
});

test('resolverLoginEmail rechaza password invalido', async () => {
  const deps = crearDepsLogin({
    compararPassword: async (password, passwordHash) => {
      deps.llamadas.compararPassword.push({ password, passwordHash });
      return false;
    },
  });

  const respuesta = await resolverLoginEmail({
    email: 'usuario@agroapp.local',
    password: 'password-incorrecto',
  }, deps);

  assert.equal(respuesta.status, 401);
  assert.match(respuesta.body.error, /Credenciales/);
  assert.deepEqual(deps.llamadas.compararPassword, [{
    password: 'password-incorrecto',
    passwordHash: 'hash-password',
  }]);
});

test('resolverLoginEmail devuelve sesion con token y permisos si password es valido', async () => {
  const deps = crearDepsLogin();

  const respuesta = await resolverLoginEmail({
    email: 'usuario@agroapp.local',
    password: 'password-valido',
  }, deps);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.mensaje, 'Login correcto');
  assert.equal(respuesta.body.origen, 'email');
  assert.equal(respuesta.body.usuario.id, 'usuario-1');
  assert.equal(respuesta.body.usuario.email, 'usuario@agroapp.local');
  assert.equal(respuesta.body.usuario.rol, 'admin');
  assert.equal(respuesta.body.usuario.clienteId, 'cliente-1');
  assert.ok(respuesta.body.permisos.includes('usuarios:gestionar'));
  assert.deepEqual(deps.llamadas.compararPassword, [{
    password: 'password-valido',
    passwordHash: 'hash-password',
  }]);

  const payload = jwt.verify(respuesta.body.token, process.env.JWT_SECRET || 'secret-dev');
  assert.equal(payload.sub, 'usuario-1');
  assert.equal(payload.email, 'usuario@agroapp.local');
  assert.equal(payload.rol, 'admin');
  assert.equal(payload.clienteId, 'cliente-1');
});
