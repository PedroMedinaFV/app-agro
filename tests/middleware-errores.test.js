const test = require('node:test');
const assert = require('node:assert/strict');
const { manejadorErrores } = require('../apps/api/dist/middleware/manejadorErrores');

const consoleErrorOriginal = console.error;

test.beforeEach(() => {
  console.error = () => {};
});

test.afterEach(() => {
  console.error = consoleErrorOriginal;
});

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

test('manejadorErrores responde 413 controlado cuando el JSON supera el limite', () => {
  const res = crearResponse();
  const error = { type: 'entity.too.large', message: 'request entity too large' };

  manejadorErrores(error, {}, res, () => {});

  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, {
    error: 'La solicitud supera el tamanio maximo permitido.',
    detalle: 'Reduce la cantidad de datos enviados o ajusta API_JSON_LIMIT de forma controlada.',
  });
});

test('manejadorErrores no expone detalle interno para errores sin statusCode', () => {
  const res = crearResponse();
  const error = new Error('detalle tecnico sensible');

  manejadorErrores(error, {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: 'Error interno del servidor',
  });
});

test('manejadorErrores oculta tambien errores 5xx con statusCode y valida el rango HTTP', () => {
  for (const statusCode of [503, 500, 200, 999, '403']) {
    const res = crearResponse();
    manejadorErrores(Object.assign(new Error('password-interno'), { statusCode }), {}, res, () => {});
    assert.equal(res.statusCode, statusCode === 503 ? 503 : 500);
    assert.deepEqual(res.body, { error: 'Error interno del servidor' });
  }
});

test('manejadorErrores delega cuando los headers ya fueron enviados', () => {
  const error = new Error('respuesta iniciada');
  let delegado;
  manejadorErrores(error, {}, { headersSent: true }, (recibido) => { delegado = recibido; });
  assert.equal(delegado, error);
});

test('manejadorErrores respeta statusCode y mensaje de errores controlados', () => {
  const res = crearResponse();
  const error = new Error('No tienes permisos para esta accion');
  error.statusCode = 403;

  manejadorErrores(error, {}, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: 'No tienes permisos para esta accion',
    detalle: 'No tienes permisos para esta accion',
  });
});
