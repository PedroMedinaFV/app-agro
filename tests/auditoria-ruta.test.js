const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolverConsultaAuditoria,
} = require('../apps/api/dist/routes/auditoria');

test('resolverConsultaAuditoria responde 403 si no puede determinar cliente', async () => {
  let llamado = false;

  const respuesta = await resolverConsultaAuditoria({
    user: { sub: 'usuario-1', rol: 'admin' },
    query: {},
  }, async () => {
    llamado = true;
    return { eventos: [], total: 0, limite: 100 };
  });

  assert.equal(respuesta.status, 403);
  assert.deepEqual(respuesta.body, {
    error: 'No se pudo determinar el cliente para consultar auditoria.',
  });
  assert.equal(llamado, false);
});

test('resolverConsultaAuditoria fuerza cliente autenticado y pasa filtros al servicio', async () => {
  const llamadas = [];
  const respuestaServicio = {
    eventos: [{
      id: 'aud-1',
      clienteId: 'cliente-auth',
      entidad: 'PlanificacionAgricola',
      entidadId: 'plan-1',
      accion: 'cerrar',
      origen: 'web',
      createdAt: '2026-10-02T10:30:00.000Z',
    }],
    total: 1,
    limite: 25,
  };

  const respuesta = await resolverConsultaAuditoria({
    user: { sub: 'usuario-1', rol: 'admin', clienteId: 'cliente-auth' },
    query: {
      entidad: 'PlanificacionAgricola',
      accion: 'cerrar',
      usuarioId: 'usuario-2',
      limite: '25',
    },
  }, async (filtros) => {
    llamadas.push(filtros);
    return respuestaServicio;
  });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body, respuestaServicio);
  assert.deepEqual(llamadas, [{
    clienteId: 'cliente-auth',
    entidad: 'PlanificacionAgricola',
    accion: 'cerrar',
    usuarioId: 'usuario-2',
    limite: 25,
  }]);
});
