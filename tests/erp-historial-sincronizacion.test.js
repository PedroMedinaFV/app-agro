const test = require('node:test');
const assert = require('node:assert/strict');
const {
  asegurarPadronesSincronizacionErp,
  mapearDetalleSincronizacionErp,
  mapearSincronizacionErp,
  normalizarItemsSincronizacionErp,
} = require('../apps/api/dist/services/erp/historialSincronizacionErp');

const fechaInicio = new Date('2026-10-03T12:00:00.000Z');
const fechaFin = new Date('2026-10-03T12:10:00.000Z');

function detalle(overrides = {}) {
  return {
    id: 'detalle-1',
    sincronizacionId: 'sync-1',
    empresaErpId: 'empresa:1',
    padron: 'campos',
    registros: 25,
    omitidos: 0,
    estado: 'completada',
    error: null,
    createdAt: fechaFin,
    ...overrides,
  };
}

function sincronizacion(overrides = {}) {
  return {
    id: 'sync-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    estado: 'completada',
    itemsSolicitados: ['cultivos', 'fantasma', 123],
    itemsEjecutados: ['cultivos', 'campanias', 'lotes', 'campos'],
    resultado: { cultivos: 10 },
    error: null,
    iniciadoEn: fechaInicio,
    finalizadoEn: fechaFin,
    ...overrides,
  };
}

test('normalizarItemsSincronizacionErp reutiliza dependencias de padrones solicitados', () => {
  const items = normalizarItemsSincronizacionErp(['cultivos', 'servicios']);

  assert.equal(items.includes('cultivos'), true);
  assert.equal(items.includes('campanias'), true);
  assert.equal(items.includes('actividades'), true);
  assert.equal(items.includes('especies'), true);
  assert.equal(items.includes('lotes'), true);
  assert.equal(items.includes('campos'), true);
  assert.equal(items.includes('zonas'), true);
  assert.equal(items.includes('servicios'), true);
  assert.equal(items.includes('tiposServicio'), true);
  assert.equal(items.includes('unidadesMedida'), true);
});

test('asegurarPadronesSincronizacionErp descarta valores desconocidos o no array', () => {
  assert.deepEqual(asegurarPadronesSincronizacionErp(undefined), []);
  assert.deepEqual(asegurarPadronesSincronizacionErp('campos'), []);
  assert.deepEqual(asegurarPadronesSincronizacionErp(['campos', 'lotes', 'otro', 99]), ['campos', 'lotes']);
});

test('mapearDetalleSincronizacionErp serializa detalle y omite error nulo', () => {
  assert.deepEqual(mapearDetalleSincronizacionErp(detalle()), {
    id: 'detalle-1',
    sincronizacionId: 'sync-1',
    empresaErpId: 'empresa:1',
    padron: 'campos',
    registros: 25,
    omitidos: 0,
    estado: 'completada',
    error: undefined,
    createdAt: '2026-10-03T12:10:00.000Z',
  });
});

test('mapearSincronizacionErp filtra items invalidos y agrupa detalles mapeados', () => {
  const mapeada = mapearSincronizacionErp(sincronizacion(), [
    detalle(),
    detalle({ id: 'detalle-2', padron: 'lotes', registros: 8, omitidos: 2, error: 'Lotes sin campo' }),
  ]);

  assert.equal(mapeada.id, 'sync-1');
  assert.equal(mapeada.usuarioId, 'usuario-1');
  assert.deepEqual(mapeada.itemsSolicitados, ['cultivos']);
  assert.deepEqual(mapeada.itemsEjecutados, ['cultivos', 'campanias', 'lotes', 'campos']);
  assert.deepEqual(mapeada.resultado, { cultivos: 10 });
  assert.equal(mapeada.error, undefined);
  assert.equal(mapeada.iniciadoEn, '2026-10-03T12:00:00.000Z');
  assert.equal(mapeada.finalizadoEn, '2026-10-03T12:10:00.000Z');
  assert.equal(mapeada.detalles.length, 2);
  assert.equal(mapeada.detalles[1].error, 'Lotes sin campo');
});

test('mapearSincronizacionErp tolera usuario, resultado y finalizacion ausentes', () => {
  const mapeada = mapearSincronizacionErp(sincronizacion({
    usuarioId: null,
    estado: 'error',
    resultado: null,
    error: 'Credenciales invalidas',
    finalizadoEn: null,
  }), []);

  assert.equal(mapeada.usuarioId, undefined);
  assert.equal(mapeada.resultado, undefined);
  assert.equal(mapeada.error, 'Credenciales invalidas');
  assert.equal(mapeada.finalizadoEn, undefined);
  assert.deepEqual(mapeada.detalles, []);
});
