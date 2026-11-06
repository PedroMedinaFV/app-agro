const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'clave-sesion-jwt-test-32-bytes-minimum';
const jwt = require('../apps/api/node_modules/jsonwebtoken');
const { crearTokenSesion, verificarTokenSesion } = require('../apps/api/dist/services/seguridad/sesionJwt');

test('sesion JWT firma y verifica con mismos algoritmo, duracion y claims', () => {
  const token = crearTokenSesion({ id: 'u1', email: 'user@agro.local', rol: 'admin', clienteId: 'c1' });
  assert.deepEqual(verificarTokenSesion(token), { sub: 'u1', email: 'user@agro.local', rol: 'admin', clienteId: 'c1' });
  const payload = jwt.decode(token, { complete: true });
  assert.equal(payload.header.alg, 'HS256');
  assert.equal(payload.payload.exp - payload.payload.iat, 8 * 60 * 60);
});

test('sesion JWT rechaza firma ajena, expirados, otro algoritmo y claims incompletos', () => {
  const payload = { sub: 'u1', email: 'user@agro.local' };
  const tokens = [
    jwt.sign(payload, 'otra-clave-32-bytes-minimum-para-test', { expiresIn: '8h' }),
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 }),
    jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '8h' }),
    jwt.sign(payload, process.env.JWT_SECRET),
    jwt.sign({ email: payload.email }, process.env.JWT_SECRET, { expiresIn: '8h' }),
    jwt.sign({ ...payload, rol: {} }, process.env.JWT_SECRET, { expiresIn: '8h' }),
  ];
  for (const token of tokens) assert.throws(() => verificarTokenSesion(token));
});
