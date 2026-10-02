const test = require('node:test');
const assert = require('node:assert/strict');
const {
  esEstadoMapaNdvi,
  esOrigenMapaNdvi,
  prepararMapaNdviParaGuardar,
  validarNumeroOpcional,
  validarRangosNdvi,
} = require('../apps/api/dist/services/ndvi/validacionesNdvi');

function crearMapa(overrides = {}) {
  return {
    fechaImagen: '2026-09-30T12:00:00.000Z',
    fechaProcesamiento: '2026-10-01T12:00:00.000Z',
    proveedor: '  Sentinel   Hub  ',
    origen: 'proveedor_api',
    resolucionMetros: 10,
    nubosidadPorcentaje: 25,
    ndviPromedio: 0.55,
    ndviMinimo: 0.1,
    ndviMaximo: 0.9,
    ndviDesvio: 0.12,
    superficieAnalizadaHa: 80,
    estado: 'procesado',
    activo: true,
    ...overrides,
  };
}

test('esOrigenMapaNdvi y esEstadoMapaNdvi aceptan solo catalogos soportados', () => {
  assert.equal(esOrigenMapaNdvi('manual'), true);
  assert.equal(esOrigenMapaNdvi('proveedor_api'), true);
  assert.equal(esOrigenMapaNdvi('planilla'), false);

  assert.equal(esEstadoMapaNdvi('procesado'), true);
  assert.equal(esEstadoMapaNdvi('archivado'), true);
  assert.equal(esEstadoMapaNdvi('publicado'), false);
});

test('validarNumeroOpcional acepta indefinido y rechaza no finitos o fuera de rango', () => {
  assert.doesNotThrow(() => validarNumeroOpcional(undefined, 'NDVI', -1, 1));
  assert.doesNotThrow(() => validarNumeroOpcional(0.5, 'NDVI', -1, 1));
  assert.throws(() => validarNumeroOpcional(Number.NaN, 'NDVI', -1, 1), /debe ser numerico/);
  assert.throws(() => validarNumeroOpcional(-2, 'NDVI', -1, 1), /mayor o igual a -1/);
  assert.throws(() => validarNumeroOpcional(2, 'NDVI', -1, 1), /menor o igual a 1/);
});

test('validarRangosNdvi protege rangos de nubosidad, NDVI y superficie', () => {
  assert.doesNotThrow(() => validarRangosNdvi(crearMapa()));
  assert.throws(() => validarRangosNdvi(crearMapa({ resolucionMetros: -1 })), /resolucion.*mayor o igual a 0/);
  assert.throws(() => validarRangosNdvi(crearMapa({ nubosidadPorcentaje: 101 })), /nubosidad.*menor o igual a 100/);
  assert.throws(() => validarRangosNdvi(crearMapa({ ndviPromedio: 1.01 })), /NDVI promedio.*menor o igual a 1/);
  assert.throws(() => validarRangosNdvi(crearMapa({ ndviDesvio: -0.01 })), /desvio NDVI.*mayor o igual a 0/);
  assert.throws(() => validarRangosNdvi(crearMapa({ superficieAnalizadaHa: -1 })), /superficie analizada.*mayor o igual a 0/);
  assert.throws(() => validarRangosNdvi(crearMapa({ ndviMinimo: 0.8, ndviMaximo: 0.2 })), /minimo no puede ser mayor/);
});

test('prepararMapaNdviParaGuardar recorta proveedor y devuelve fechas parseadas', () => {
  const resultado = prepararMapaNdviParaGuardar(crearMapa(), Date.parse('2026-10-02T00:00:00.000Z'));

  assert.equal(resultado.mapa.proveedor, 'Sentinel   Hub');
  assert.equal(resultado.fechaImagen.toISOString(), '2026-09-30T12:00:00.000Z');
  assert.equal(resultado.fechaProcesamiento.toISOString(), '2026-10-01T12:00:00.000Z');
});

test('prepararMapaNdviParaGuardar rechaza fechas, proveedor, origen y estado invalidos', () => {
  const ahora = Date.parse('2026-10-02T00:00:00.000Z');

  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ fechaImagen: 'sin-fecha' }), ahora), /fecha de imagen NDVI no es valida/);
  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ fechaImagen: '2026-10-03T00:00:00.000Z' }), ahora), /no puede ser futura/);
  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ fechaProcesamiento: 'sin-fecha' }), ahora), /fecha de procesamiento NDVI no es valida/);
  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ proveedor: '   ' }), ahora), /proveedor NDVI es obligatorio/);
  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ origen: 'planilla' }), ahora), /origen NDVI no es valido/);
  assert.throws(() => prepararMapaNdviParaGuardar(crearMapa({ estado: 'publicado' }), ahora), /estado NDVI no es valido/);
});
