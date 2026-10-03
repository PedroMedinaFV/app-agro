const test = require('node:test');
const assert = require('node:assert/strict');
const {
  construirWhereAuditoria,
  listarEventosAuditoriaConCliente,
  mapearEventoAuditoria,
  normalizarLimiteAuditoria,
} = require('../apps/api/dist/services/auditoria/auditoriaPrisma');

const fecha = new Date('2026-10-02T10:30:00.000Z');

function crearEvento(overrides = {}) {
  return {
    id: 'aud-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    entidad: 'PlanificacionAgricola',
    entidadId: 'plan-1',
    accion: 'cerrar',
    origen: 'web',
    motivo: 'Cierre aprobado',
    valoresAntes: { estado: 'aprobada' },
    valoresDespues: { estado: 'cerrada' },
    metadata: { ip: 'local' },
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: fecha,
    ...overrides,
  };
}

test('normalizarLimiteAuditoria aplica default, truncado y rango seguro', () => {
  assert.equal(normalizarLimiteAuditoria(undefined), 100);
  assert.equal(normalizarLimiteAuditoria(Number.NaN), 100);
  assert.equal(normalizarLimiteAuditoria(0), 100);
  assert.equal(normalizarLimiteAuditoria(-5), 1);
  assert.equal(normalizarLimiteAuditoria(25.9), 25);
  assert.equal(normalizarLimiteAuditoria(1000), 300);
});

test('construirWhereAuditoria solo incluye filtros presentes', () => {
  assert.deepEqual(construirWhereAuditoria({
    clienteId: 'cliente-1',
    entidad: 'PlanificacionAgricola',
    accion: 'cerrar',
    usuarioId: 'usuario-1',
    limite: 50,
  }), {
    clienteId: 'cliente-1',
    entidad: 'PlanificacionAgricola',
    accion: 'cerrar',
    usuarioId: 'usuario-1',
  });

  assert.deepEqual(construirWhereAuditoria({ clienteId: 'cliente-1' }), {
    clienteId: 'cliente-1',
  });
});

test('mapearEventoAuditoria enriquece usuario y omite nulos operativos', () => {
  const evento = mapearEventoAuditoria(crearEvento({
    motivo: null,
    valoresAntes: null,
    valoresDespues: null,
    metadata: null,
    ip: null,
    userAgent: null,
  }), new Map([
    ['usuario-1', { id: 'usuario-1', email: 'admin@agro.test', nombre: 'Admin Agro' }],
  ]));

  assert.equal(evento.usuarioEmail, 'admin@agro.test');
  assert.equal(evento.usuarioNombre, 'Admin Agro');
  assert.equal(evento.motivo, undefined);
  assert.equal(evento.valoresAntes, undefined);
  assert.equal(evento.valoresDespues, undefined);
  assert.equal(evento.metadata, undefined);
  assert.equal(evento.ip, undefined);
  assert.equal(evento.userAgent, undefined);
  assert.equal(evento.createdAt, '2026-10-02T10:30:00.000Z');
});

test('mapearEventoAuditoria tolera eventos sin usuario asociado', () => {
  const evento = mapearEventoAuditoria(crearEvento({ usuarioId: null }), new Map());

  assert.equal(evento.usuarioId, undefined);
  assert.equal(evento.usuarioEmail, undefined);
  assert.equal(evento.usuarioNombre, undefined);
  assert.equal(evento.accion, 'cerrar');
});

test('listarEventosAuditoriaConCliente pagina, filtra por cliente y resuelve usuarios usados', async () => {
  const eventos = [
    crearEvento({ id: 'aud-1', usuarioId: 'usuario-1' }),
    crearEvento({ id: 'aud-2', usuarioId: 'usuario-1', accion: 'bloquear_edicion' }),
    crearEvento({ id: 'aud-3', usuarioId: null, accion: 'crear' }),
  ];
  const findManyCalls = [];
  const countCalls = [];
  const usuarioFindManyCalls = [];
  const client = {
    auditoriaEvento: {
      findMany: async (args) => {
        findManyCalls.push(args);
        return eventos;
      },
      count: async (args) => {
        countCalls.push(args);
        return 3;
      },
    },
    usuario: {
      findMany: async (args) => {
        usuarioFindManyCalls.push(args);
        return [{ id: 'usuario-1', email: 'admin@agro.test', nombre: null }];
      },
    },
  };

  const respuesta = await listarEventosAuditoriaConCliente(client, {
    clienteId: 'cliente-1',
    entidad: 'PlanificacionAgricola',
    limite: 2.9,
  });

  assert.equal(respuesta.total, 3);
  assert.equal(respuesta.limite, 2);
  assert.equal(respuesta.eventos.length, 3);
  assert.equal(respuesta.eventos[0].usuarioEmail, 'admin@agro.test');
  assert.equal(respuesta.eventos[2].usuarioEmail, undefined);
  assert.deepEqual(findManyCalls[0], {
    where: {
      clienteId: 'cliente-1',
      entidad: 'PlanificacionAgricola',
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  assert.deepEqual(countCalls[0], {
    where: {
      clienteId: 'cliente-1',
      entidad: 'PlanificacionAgricola',
    },
  });
  assert.deepEqual(usuarioFindManyCalls[0].where.id.in, ['usuario-1']);
});
