const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
process.env.JWT_SECRET = 'clave-auth-http-test-32-bytes-minimum';
const express = require('../apps/api/node_modules/express');
const { crearRouterAuth, resolverLoginEmail, resolverRegistroEmail, resolverLoginMicrosoft } = require('../apps/api/dist/routes/auth');
const { manejadorErrores } = require('../apps/api/dist/middleware/manejadorErrores');

const usuario = { id: 'u1', email: 'user@agro.local', rol: 'operador_campo', clienteId: 'c1', password: 'hash' };
const depsRegistro = {
  buscarUsuarioPorEmail: async () => null,
  hashPassword: async () => 'hash',
  crearUsuarioEmail: async (datos) => ({ ...usuario, ...datos }),
};
const depsLogin = { buscarUsuarioPorEmail: async () => usuario, compararPassword: async () => true };

async function conServidor(overrides, verificar) {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use('/auth', crearRouterAuth({
    registro: (input) => resolverRegistroEmail(input, depsRegistro),
    login: (input) => resolverLoginEmail(input, depsLogin),
    microsoft: (token) => resolverLoginMicrosoft(token, {
      validarIdToken: async () => { throw new Error('detalle privado proveedor'); },
      buscarUsuarioPorEmail: async () => usuario,
      actualizarUsuarioMicrosoft: async () => usuario,
    }),
    ...overrides,
  }));
  app.use(manejadorErrores);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/auth`;
  const enviar = async (ruta, body, raw = false) => {
    const response = await fetch(base + ruta, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: raw ? body : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    await verificar(enviar);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('HTTP auth rechaza entradas invalidas sin consultar datos ni hashear', async () => {
  let consultas = 0;
  const noConsultar = async () => { consultas += 1; throw new Error('no debe ejecutarse'); };
  await conServidor({
    login: (input) => resolverLoginEmail(input, { buscarUsuarioPorEmail: noConsultar, compararPassword: noConsultar }),
    registro: (input) => resolverRegistroEmail(input, {
      buscarUsuarioPorEmail: noConsultar, hashPassword: noConsultar, crearUsuarioEmail: noConsultar,
    }),
  }, async (enviar) => {
    for (const ruta of ['/login', '/registro']) {
      for (const datos of [null, [], {}, { email: {}, password: 'password' }]) {
        assert.equal((await enviar(ruta, datos)).status, 400);
      }
    }
    assert.equal((await enviar('/microsoft', { idToken: {} })).status, 400);
    assert.equal(consultas, 0);
  });
});

test('HTTP auth responde JSON seguro ante cuerpo malformado o excesivo', async () => {
  await conServidor({}, async (enviar) => {
    assert.deepEqual(await enviar('/login', '{"password":"no-publicar",', true), {
      status: 400, body: { error: 'El cuerpo JSON no es valido.' },
    });
    const grande = await enviar('/login', { password: 'x'.repeat(1100) });
    assert.equal(grande.status, 413);
    assert.ok(!JSON.stringify(grande.body).includes('xxxx'));
  });
});

test('HTTP auth conserva contratos de sesion, normalizacion y credenciales incorrectas', async () => {
  let emailConsultado;
  await conServidor({ login: (input) => resolverLoginEmail(input, {
    buscarUsuarioPorEmail: async (email) => { emailConsultado = email; return usuario; },
    compararPassword: async (password) => password === ' password ',
  }) }, async (enviar) => {
    const login = await enviar('/login', { email: ' USER@AGRO.LOCAL ', password: ' password ' });
    assert.equal(login.status, 200);
    assert.equal(emailConsultado, 'user@agro.local');
    assert.equal(login.body.usuario.clienteId, 'c1');
    assert.equal(typeof login.body.token, 'string');
    assert.ok(Array.isArray(login.body.permisos));
    assert.ok(!('password' in login.body.usuario));
    assert.equal((await enviar('/login', { email: usuario.email, password: 'incorrecta' })).status, 401);
    const registro = await enviar('/registro', { email: usuario.email, password: 'password', rol: 'admin', clienteId: 'ajeno' });
    assert.equal(registro.status, 201);
    assert.equal(registro.body.usuario.rol, 'operador_campo');
    assert.equal(registro.body.usuario.clienteId, 'c1');
  });
});

test('HTTP auth propaga rechazos de base, hash, comparacion y proveedor sin exponer detalles', async () => {
  const errorInterno = new Error('conexion postgres://usuario:password-privado@interno');
  const fallar = async () => { throw errorInterno; };
  const escenarios = [
    ['/login', { login: (input) => resolverLoginEmail(input, { ...depsLogin, buscarUsuarioPorEmail: fallar }) }],
    ['/login', { login: (input) => resolverLoginEmail(input, { ...depsLogin, compararPassword: fallar }) }],
    ['/registro', { registro: (input) => resolverRegistroEmail(input, { ...depsRegistro, hashPassword: fallar }) }],
    ['/registro', { registro: (input) => resolverRegistroEmail(input, { ...depsRegistro, crearUsuarioEmail: fallar }) }],
    ['/microsoft', {}],
  ];
  const logOriginal = console.error;
  console.error = () => {};
  try {
    for (const [ruta, overrides] of escenarios) {
      await conServidor(overrides, async (enviar) => {
        const respuesta = await enviar(ruta, { email: usuario.email, password: 'password', idToken: 'token-test' });
        assert.deepEqual(respuesta, { status: 500, body: { error: 'Error interno del servidor' } });
      });
    }
  } finally {
    console.error = logOriginal;
  }
});
