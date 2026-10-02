const test = require('node:test');
const assert = require('node:assert/strict');
const {
  recalcularLineaPlanificacionPersistida,
  validarCabeceraPlanificacion,
  validarLineasPlanificacion,
  validarPlanificacionTieneLineasParaCierre,
} = require('../apps/api/dist/services/planificacion/validacionesPlanificacion');

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
    gastosComercialesEstimados: 600,
    protocoloId: 'protocolo-1',
    costoProduccionEstimado: 1500,
    ingresoBrutoEstimado: 0,
    ingresoNetoEstimado: 0,
    margenBrutoEstimado: 0,
    estado: 'borrador',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearPlanificacion(overrides = {}) {
  return {
    id: 'plan-1',
    clienteId: 'cliente-1',
    campaniaErpId: 'campania-26',
    nombre: 'Plan campaña 26',
    estado: 'borrador',
    escenarioOriginal: false,
    lineas: [crearLinea()],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function lotesPorId(entries = [['lote-1', { id: 'lote-1', nombre: 'Lote 1', superficieTotal: 100 }]]) {
  return new Map(entries);
}

test('validarCabeceraPlanificacion exige cliente y campania y bloquea estados finales por guardado comun', () => {
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ campaniaErpId: '' })), /campaniaErpId/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ estado: 'cerrada' })), /endpoint especifico de cierre/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ estado: 'deshabilitada' })), /endpoint especifico de cierre/);
});

test('validarLineasPlanificacion permite hectareas cero en borrador pero no en cierre', () => {
  const planificacion = crearPlanificacion({
    lineas: [crearLinea({ hectareasPlanificadas: 0 })],
  });

  assert.doesNotThrow(() => validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }));
  assert.throws(() => validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: false,
    lotesPorId: lotesPorId(),
  }), /mayores a cero para cerrar/);
});

test('validarLineasPlanificacion rechaza lote inexistente o hectareas mayores a superficie total', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion(), {
    permitirHectareasCero: true,
    lotesPorId: new Map(),
  }), /lote valido del cliente/);

  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ hectareasPlanificadas: 101 })],
  }), {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }), /no pueden superar su superficie total/);
});

test('validarLineasPlanificacion rechaza valores economicos negativos o no finitos', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ rindeEstimado: -1 })],
  }), { permitirHectareasCero: true, lotesPorId: lotesPorId() }), /Rinde, precio, gastos y costos no pueden ser negativos/);

  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ precioVentaEstimado: Number.NaN })],
  }), { permitirHectareasCero: true, lotesPorId: lotesPorId() }), /Rinde, precio, gastos y costos no pueden ser negativos/);
});

test('validarLineasPlanificacion rechaza duplicados por campania, campo, lote y actividad', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [
      crearLinea({ id: 'linea-1' }),
      crearLinea({ id: 'linea-2' }),
    ],
  }), {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }), /No se puede repetir la misma actividad/);
});

test('validarPlanificacionTieneLineasParaCierre exige al menos una linea', () => {
  assert.throws(() => validarPlanificacionTieneLineasParaCierre(crearPlanificacion({ lineas: [] })), /al menos una linea/);
});

test('recalcularLineaPlanificacionPersistida recalcula bruto, neto y margen preservando margen actualizado existente', () => {
  const recalculada = recalcularLineaPlanificacionPersistida(crearLinea({
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    precioVentaEstimado: 200,
    gastosComercialesEstimados: 600,
    costoProduccionEstimado: 1500,
    margenBrutoActualizado: 999,
  }));

  assert.equal(recalculada.ingresoBrutoEstimado, 6000);
  assert.equal(recalculada.ingresoNetoEstimado, 5400);
  assert.equal(recalculada.margenBrutoEstimado, 3900);
  assert.equal(recalculada.margenBrutoActualizado, 999);
});
