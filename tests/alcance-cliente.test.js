const test = require('node:test');
const assert = require('node:assert/strict');
const { validarClienteSesion } = require('../apps/api/dist/services/seguridad/alcanceCliente');
const { requiereClienteRuta } = require('../apps/api/dist/middleware/cliente');

test('alcance de cliente exige sesion y no concede acceso por rol administrativo', () => {
  assert.throws(() => validarClienteSesion('a', undefined), { statusCode: 401 });
  assert.throws(() => validarClienteSesion('a', { clienteId: 'b', rol: 'admin' }), { statusCode: 403 });
  assert.doesNotThrow(() => validarClienteSesion('a', { clienteId: 'a' }));
});

test('middleware de cliente propaga denegacion antes de ejecutar el handler administrativo', () => {
  let recibido;
  requiereClienteRuta({ params: { clienteId: 'b' }, user: { clienteId: 'a' } }, {}, (error) => { recibido = error; });
  assert.equal(recibido.statusCode, 403);
  requiereClienteRuta({ params: { clienteId: 'a' }, user: { clienteId: 'a' } }, {}, (error) => { recibido = error; });
  assert.equal(recibido, undefined);
});
