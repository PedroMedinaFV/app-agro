const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'secret-test';

const jwt = require('../apps/api/node_modules/jsonwebtoken');
const { autenticacionBasica } = require('../apps/api/dist/middleware/autenticacion');

function crearResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('autenticacionBasica rechaza requests sin Bearer token', () => {
  const req = { headers: {} };
  const res = crearResponse();
  let nextLlamado = false;

  autenticacionBasica(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /^Falta token de autenticaci/);
});

test('autenticacionBasica rechaza token invalido o expirado', () => {
  const req = { headers: { authorization: 'Bearer token-invalido' } };
  const res = crearResponse();
  let nextLlamado = false;

  autenticacionBasica(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /^Token inv/);
});

test('autenticacionBasica carga usuario y permite avanzar con token valido', () => {
  const token = jwt.sign(
    {
      sub: 'usuario-1',
      email: 'operador@agroapp.local',
      rol: 'operador_campo',
      clienteId: 'cliente-1',
    },
    'secret-test',
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = crearResponse();
  let nextLlamado = false;

  autenticacionBasica(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.equal(res.statusCode, undefined);
  assert.equal(req.user.sub, 'usuario-1');
  assert.equal(req.user.email, 'operador@agroapp.local');
  assert.equal(req.user.rol, 'operador_campo');
  assert.equal(req.user.clienteId, 'cliente-1');
});
