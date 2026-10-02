const test = require('node:test');
const assert = require('node:assert/strict');
const {
  aplicarCostosDesdePadrones,
  validarFechasProtocolo,
  validarItemsProtocolo,
  validarProtocolo,
} = require('../apps/api/dist/services/planificacion/validacionesProtocolos');

function crearLabor(overrides = {}) {
  return {
    id: 'labor-1',
    etapaId: 'etapa-1',
    servicioAppId: 'servicio-1',
    indiceAplicacion: 0.5,
    nombre: 'Labor manual',
    unidad: 'Ha',
    cantidadPorHa: 2,
    costoUnitario: 50,
    costoPorHa: 0,
    ...overrides,
  };
}

function crearInsumo(overrides = {}) {
  return {
    id: 'insumo-linea-1',
    etapaId: 'etapa-1',
    indiceAplicacion: 0.25,
    insumoAppId: 'insumo-1',
    nombre: 'Insumo manual',
    unidad: 'L',
    dosisPorHa: 4,
    precioUnitarioEstimado: 20,
    costoPorHa: 0,
    ...overrides,
  };
}

function crearEtapa(overrides = {}) {
  return {
    id: 'etapa-1',
    protocoloId: 'protocolo-1',
    estadioReferenciaId: 'estadio-1',
    estadioCodigo: 'V1',
    orden: 1,
    nombre: 'Siembra',
    diasDesdeSiembra: 0,
    labores: [crearLabor()],
    insumos: [crearInsumo()],
    ...overrides,
  };
}

function crearProtocolo(overrides = {}) {
  return {
    id: 'protocolo-1',
    clienteId: 'cliente-1',
    nombre: 'Protocolo soja',
    descripcion: 'Base',
    campaniaErpId: 'campania-26',
    actividadAppId: 'actividad-1',
    tipoFecha: 'relativa_siembra',
    fechaSiembra: '2026-10-01T00:00:00.000Z',
    costoEstimadoPorHa: 0,
    activo: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    etapas: [crearEtapa()],
    ...overrides,
  };
}

test('validarFechasProtocolo exige dias relativos enteros y siembra en dia cero', () => {
  assert.doesNotThrow(() => validarFechasProtocolo(crearProtocolo()));
  assert.throws(() => validarFechasProtocolo(crearProtocolo({
    etapas: [crearEtapa({ diasDesdeSiembra: 0.5 })],
  })), /diasDesdeSiembra entero/);
  assert.throws(() => validarFechasProtocolo(crearProtocolo({
    fechaSiembra: undefined,
  })), /fecha de siembra es obligatoria/);
  assert.throws(() => validarFechasProtocolo(crearProtocolo({
    etapas: [crearEtapa({ diasDesdeSiembra: 3 })],
  })), /Siembra.*igual a 0/);
});

test('validarFechasProtocolo exige fecha objetivo en protocolos absolutos', () => {
  assert.throws(() => validarFechasProtocolo(crearProtocolo({
    tipoFecha: 'absoluta',
    etapas: [crearEtapa({ diasDesdeSiembra: undefined, fechaObjetivo: undefined })],
  })), /fechaObjetivo/);

  assert.doesNotThrow(() => validarFechasProtocolo(crearProtocolo({
    tipoFecha: 'absoluta',
    etapas: [crearEtapa({ diasDesdeSiembra: undefined, fechaObjetivo: '2026-10-15T00:00:00.000Z' })],
  })));
});

test('validarItemsProtocolo exige estadio e indices de aplicacion entre cero y uno', () => {
  assert.doesNotThrow(() => validarItemsProtocolo(crearProtocolo()));
  assert.throws(() => validarItemsProtocolo(crearProtocolo({
    etapas: [crearEtapa({ estadioReferenciaId: undefined })],
  })), /debe tener un estadio/);
  assert.throws(() => validarItemsProtocolo(crearProtocolo({
    etapas: [crearEtapa({ labores: [crearLabor({ indiceAplicacion: 1.01 })] })],
  })), /labores.*entre 0 y 1/);
  assert.throws(() => validarItemsProtocolo(crearProtocolo({
    etapas: [crearEtapa({ insumos: [crearInsumo({ indiceAplicacion: Number.NaN })] })],
  })), /insumos.*entre 0 y 1/);
});

test('validarProtocolo exige cabecera minima y delega fechas e items', () => {
  assert.doesNotThrow(() => validarProtocolo(crearProtocolo()));
  assert.throws(() => validarProtocolo(crearProtocolo({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarProtocolo(crearProtocolo({ campaniaErpId: '' })), /campaniaErpId/);
  assert.throws(() => validarProtocolo(crearProtocolo({ actividadAppId: '' })), /actividadAppId/);
  assert.throws(() => validarProtocolo(crearProtocolo({
    etapas: [crearEtapa({ estadioReferenciaId: undefined })],
  })), /debe tener un estadio/);
});

test('aplicarCostosDesdePadrones actualiza labores e insumos y recalcula costo por hectarea', () => {
  const actualizado = aplicarCostosDesdePadrones(
    crearProtocolo(),
    new Map([['servicio-1', {
      id: 'servicio-1',
      nombre: 'Pulverizacion',
      descripcionAbreviada: 'Aplicacion',
      unidadSugerida: 'Ha',
      costoUnitarioSugerido: 80,
    }]]),
    new Map([['insumo-1', {
      id: 'insumo-1',
      insumoErpId: 'global:insumo:1',
      nombre: 'Glifosato',
      tipo: 'Herbicida',
      unidad: 'L',
      precioUnitarioEstimado: 30,
    }]]),
  );

  const labor = actualizado.etapas[0].labores[0];
  const insumo = actualizado.etapas[0].insumos[0];

  assert.equal(labor.nombre, 'Pulverizacion');
  assert.equal(labor.descripcion, 'Aplicacion');
  assert.equal(labor.costoUnitario, 80);
  assert.equal(labor.costoPorHa, 80);
  assert.equal(insumo.nombre, 'Glifosato');
  assert.equal(insumo.insumoErpId, 'global:insumo:1');
  assert.equal(insumo.precioUnitarioEstimado, 30);
  assert.equal(insumo.costoPorHa, 30);
});

test('aplicarCostosDesdePadrones recalcula costos aun sin padron asociado', () => {
  const actualizado = aplicarCostosDesdePadrones(
    crearProtocolo({
      etapas: [crearEtapa({
        labores: [crearLabor({ servicioAppId: undefined, costoPorHa: 999 })],
        insumos: [crearInsumo({ insumoAppId: 'insumo-faltante', costoPorHa: 999 })],
      })],
    }),
    new Map(),
    new Map(),
  );

  assert.equal(actualizado.etapas[0].labores[0].costoPorHa, 50);
  assert.equal(actualizado.etapas[0].insumos[0].costoPorHa, 20);
});
