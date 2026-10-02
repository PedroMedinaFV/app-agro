const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarDatosBasicosPrecipitacion,
} = require('../apps/api/dist/services/precipitaciones/validacionesPrecipitaciones');

function crearPrecipitacion(overrides = {}) {
  return {
    campoAppId: 'campo-1',
    loteAppId: 'lote-1',
    registroMovilId: 'movil-1',
    milimetros: 42.5,
    fechaEvento: '2026-10-01T10:00:00.000Z',
    observaciones: '  lluvia intensa sobre cabecera  ',
    origen: 'mobile',
    ...overrides,
  };
}

test('validarDatosBasicosPrecipitacion normaliza fecha y observaciones', () => {
  const resultado = validarDatosBasicosPrecipitacion(crearPrecipitacion());

  assert.equal(resultado.fechaEvento.toISOString(), '2026-10-01T10:00:00.000Z');
  assert.equal(resultado.observaciones, 'lluvia intensa sobre cabecera');
});

test('validarDatosBasicosPrecipitacion acepta precipitacion sin observaciones', () => {
  const resultado = validarDatosBasicosPrecipitacion(crearPrecipitacion({ observaciones: undefined }));

  assert.equal(resultado.fechaEvento.toISOString(), '2026-10-01T10:00:00.000Z');
  assert.equal(resultado.observaciones, null);
});

test('validarDatosBasicosPrecipitacion rechaza origen o campo faltante', () => {
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ origen: 'planilla' })), /origen de la precipitacion no es valido/);
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ campoAppId: '' })), /precipitacion debe tener campo/);
});

test('validarDatosBasicosPrecipitacion rechaza milimetros no finitos, cero, negativos o extremos', () => {
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ milimetros: Number.NaN })), /milimetros deben ser mayores a cero/);
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ milimetros: 0 })), /milimetros deben ser mayores a cero/);
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ milimetros: -1 })), /milimetros deben ser mayores a cero/);
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ milimetros: 1000.01 })), /superan el maximo permitido/);
});

test('validarDatosBasicosPrecipitacion rechaza fecha invalida', () => {
  assert.throws(() => validarDatosBasicosPrecipitacion(crearPrecipitacion({ fechaEvento: 'sin-fecha' })), /fecha del evento no es valida/);
});
