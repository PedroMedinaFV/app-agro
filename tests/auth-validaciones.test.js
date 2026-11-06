const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarLoginEmail, validarRegistroEmail, validarTokenMicrosoft,
} = require('../apps/api/dist/services/seguridad/validacionesAuth');

test('auth rechaza cuerpos y tipos invalidos antes de consultar infraestructura', () => {
  for (const datos of [undefined, null, [], 'texto', {}, { email: 123, password: 'password' },
    { email: 'sin-arroba', password: 'password' }, { email: 'a b@agro.local', password: 'password' },
    { email: 'user@agro.local', password: {} }, { email: 'user@agro.local', password: '' }]) {
    assert.throws(() => validarLoginEmail(datos), { statusCode: 400 });
    assert.throws(() => validarRegistroEmail(datos), { statusCode: 400 });
  }
});

test('auth normaliza email y nombre pero conserva espacios de la contrasena', () => {
  assert.deepEqual(validarRegistroEmail({ email: '  USER@AGRO.LOCAL ', nombre: ' Ana   Perez ', password: ' password ' }), {
    email: 'user@agro.local', nombre: 'Ana Perez', password: ' password ',
  });
});

test('registro exige ocho caracteres y limite bcrypt en bytes; login permite credenciales historicas cortas', () => {
  const email = 'user@agro.local';
  assert.throws(() => validarRegistroEmail({ email, password: '1234567' }), { statusCode: 400 });
  assert.equal(validarLoginEmail({ email, password: 'abc' }).password, 'abc');
  assert.equal(validarRegistroEmail({ email, password: 'a'.repeat(72) }).password.length, 72);
  for (const password of ['a'.repeat(73), 'á'.repeat(37)]) {
    assert.throws(() => validarLoginEmail({ email, password }), { statusCode: 400 });
  }
  assert.throws(() => validarRegistroEmail({ email, password: 'password', nombre: 7 }), { statusCode: 400 });
  assert.throws(() => validarRegistroEmail({ email, password: 'password', nombre: 'a'.repeat(201) }), { statusCode: 400 });
});

test('Microsoft rechaza tokens de tipo incorrecto, vacios o sobredimensionados', () => {
  for (const token of [undefined, null, {}, [], 123, '', ' ', 'a'.repeat(16385)]) {
    assert.throws(() => validarTokenMicrosoft(token), { statusCode: 400 });
  }
  assert.equal(validarTokenMicrosoft('id-token'), 'id-token');
});
