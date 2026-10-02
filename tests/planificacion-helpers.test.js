const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularGastosComercialesLinea,
  calcularResumenPlanificacion,
  lineaPlanificacionEstaCompleta,
  obtenerClavesDuplicadas,
  obtenerSuperficieInicialLote,
  recalcularLineaPlanificacion,
} = require('../packages/tipos/dist/planificacionHelpers');

function crearLinea(overrides = {}) {
  return {
    id: 'linea-1',
    planificacionId: 'plan-1',
    empresaErpId: 'empresa-1',
    campoAppId: 'campo-1',
    loteAppId: 'lote-1',
    actividadAppId: 'actividad-1',
    destinoVenta: 'Puerto',
    destinoVentaManual: false,
    precioVentaEstimado: 200,
    precioVentaManual: false,
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    gastosComercialesEstimados: 1000,
    protocoloId: 'protocolo-1',
    ingresoBrutoEstimado: 6000,
    ingresoNetoEstimado: 5000,
    costoProduccionEstimado: 1500,
    margenBrutoEstimado: 3500,
    estado: 'borrador',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

test('obtenerSuperficieInicialLote usa la productiva sin superar la total', () => {
  assert.equal(obtenerSuperficieInicialLote({
    superficieTotal: 100,
    superficieProductiva: 80,
  }), 80);

  assert.equal(obtenerSuperficieInicialLote({
    superficieTotal: 75,
    superficieProductiva: 90,
  }), 75);
});

test('lineaPlanificacionEstaCompleta exige protocolo, destino, hectareas, rinde y precio positivos', () => {
  assert.equal(lineaPlanificacionEstaCompleta(crearLinea()), true);
  assert.equal(lineaPlanificacionEstaCompleta(crearLinea({ protocoloId: undefined })), false);
  assert.equal(lineaPlanificacionEstaCompleta(crearLinea({ hectareasPlanificadas: 0 })), false);
  assert.equal(lineaPlanificacionEstaCompleta(crearLinea({ rindeEstimado: 0 })), false);
  assert.equal(lineaPlanificacionEstaCompleta(crearLinea({ precioVentaEstimado: 0 })), false);
});

test('obtenerClavesDuplicadas detecta duplicados por campania, campo, lote y actividad', () => {
  const duplicadas = obtenerClavesDuplicadas([
    crearLinea({ id: 'linea-1', loteAppId: 'lote-1', actividadAppId: 'soja' }),
    crearLinea({ id: 'linea-2', loteAppId: 'lote-1', actividadAppId: 'soja' }),
    crearLinea({ id: 'linea-3', loteAppId: 'lote-1', actividadAppId: 'maiz' }),
  ], 'campania-26');

  assert.equal(duplicadas.size, 1);
  assert.equal(duplicadas.has('campania-26|campo-1|lote-1|soja'), true);
});

test('calcularResumenPlanificacion suma margen, ingreso, costo y solo hectareas con protocolo', () => {
  const resumen = calcularResumenPlanificacion([
    crearLinea({ protocoloId: 'protocolo-1', hectareasPlanificadas: 10, ingresoNetoEstimado: 5000, costoProduccionEstimado: 1500, margenBrutoEstimado: 3500 }),
    crearLinea({ id: 'linea-2', protocoloId: undefined, hectareasPlanificadas: 20, ingresoNetoEstimado: 1000, costoProduccionEstimado: 200, margenBrutoEstimado: 800 }),
  ]);

  assert.deepEqual(resumen, {
    margenBrutoTotal: 4300,
    ingresoNetoTotal: 6000,
    costoTotal: 1700,
    hectareasPlanificadas: 10,
  });
});

test('calcularGastosComercialesLinea combina items por tonelada y por hectarea', () => {
  const gasto = calcularGastosComercialesLinea(crearLinea({
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    gastosComercialesEstimados: 999,
  }), {
    items: [
      { conceptoGastoComercialId: 'flete', conceptoNombre: 'Flete', valorPorTonelada: 20, unidadCalculo: 'Tn', moneda: 'USD' },
      { conceptoGastoComercialId: 'seguro', conceptoNombre: 'Seguro', valorPorTonelada: 5, unidadCalculo: 'Ha', moneda: 'USD' },
    ],
  });

  assert.equal(gasto, 650);
});

test('recalcularLineaPlanificacion recalcula ingreso neto, costo y margen con protocolo y gastos', () => {
  const linea = recalcularLineaPlanificacion(crearLinea({
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    precioVentaEstimado: 200,
    gastosComercialesReferenciaId: 'gasto-1',
    protocoloId: 'protocolo-1',
  }), {
    protocolosPorId: new Map([
      ['protocolo-1', { id: 'protocolo-1', costoEstimadoPorHa: 150 }],
    ]),
    gastosComercialesReferenciaPorId: new Map([
      ['gasto-1', {
        items: [
          { conceptoGastoComercialId: 'flete', conceptoNombre: 'Flete', valorPorTonelada: 20, unidadCalculo: 'Tn', moneda: 'USD' },
        ],
      }],
    ]),
  });

  assert.equal(linea.ingresoBrutoEstimado, 6000);
  assert.equal(linea.gastosComercialesEstimados, 600);
  assert.equal(linea.ingresoNetoEstimado, 5400);
  assert.equal(linea.costoProduccionEstimado, 1500);
  assert.equal(linea.margenBrutoEstimado, 3900);
  assert.equal(linea.margenBrutoActualizado, 3900);
});
