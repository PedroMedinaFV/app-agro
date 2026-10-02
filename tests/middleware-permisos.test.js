const test = require('node:test');
const assert = require('node:assert/strict');
const { requiereAlgunPermiso, requierePermiso } = require('../apps/api/dist/middleware/permisos');

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

test('requierePermiso bloquea a un operador sin permiso administrativo', () => {
  const req = { user: { rol: 'operador_campo' } };
  const res = crearResponse();
  let nextLlamado = false;

  requierePermiso('planificacion:configurar')(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'No tienes permisos para esta accion' });
});

test('requierePermiso permite avanzar a un admin con permiso requerido', () => {
  const req = { user: { rol: 'admin' } };
  const res = crearResponse();
  let nextLlamado = false;

  requierePermiso('planificacion:configurar')(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.equal(res.statusCode, undefined);
  assert.equal(res.body, undefined);
});

test('requiereAlgunPermiso permite avanzar si el rol tiene al menos uno de los permisos', () => {
  const req = { user: { rol: 'responsable_compras' } };
  const res = crearResponse();
  let nextLlamado = false;

  requiereAlgunPermiso(['auditoria:leer', 'costos:gestionar'])(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.equal(res.statusCode, undefined);
});
