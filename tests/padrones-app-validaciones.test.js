const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizarCodigo,
  obtenerIdZonaDesdeErpId,
  prepararCampoApp,
  prepararEspecieApp,
  prepararLoteApp,
  prepararZonaApp,
  validarCampoAppBasico,
  validarEspecieAppBasica,
  validarLoteAppBasico,
  validarZonaAppBasica,
} = require('../apps/api/dist/services/planificacion/validacionesPadronesApp');

function capturarError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error('Se esperaba que la funcion lanzara un error.');
}

function crearZona(overrides = {}) {
  return {
    id: 'zona-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    nombre: '  Zona   Núcleo  ',
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearCampo(overrides = {}) {
  return {
    id: 'campo-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    nombre: '  Estancia   Ñandú  ',
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearLote(overrides = {}) {
  return {
    id: 'lote-1',
    clienteId: 'cliente-1',
    campoAppId: 'campo-1',
    nombre: '  Lote   Sur  ',
    superficieTotal: 120,
    superficieProductiva: 100,
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearEspecie(overrides = {}) {
  return {
    id: 'especie-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    nombre: '  Maíz   temprano  ',
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

test('normalizarCodigo limpia espacios, acentos y mayusculas', () => {
  assert.equal(normalizarCodigo('  zona   núcleo  '), 'ZONA NUCLEO');
});

test('prepararZonaApp fuerza empresa global, codigo y estado segun vinculacion ERP', () => {
  const provisoria = prepararZonaApp(crearZona());
  const vinculada = prepararZonaApp(crearZona({ zonaErpId: 'global:zona:22' }));

  assert.equal(provisoria.empresaErpId, 'global');
  assert.equal(provisoria.nombre, 'Zona Núcleo');
  assert.equal(provisoria.codigoInterno, 'ZONA NUCLEO');
  assert.equal(provisoria.estadoVinculacion, 'provisorio');
  assert.equal(vinculada.estadoVinculacion, 'vinculado_erp');
});

test('validarZonaAppBasica exige cliente, nombre, estado valido y mismo cliente', () => {
  assert.doesNotThrow(() => validarZonaAppBasica(crearZona(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarZonaAppBasica(crearZona({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarZonaAppBasica(crearZona({ nombre: '   ' })), /nombre/);
  assert.throws(() => validarZonaAppBasica(crearZona({ estadoVinculacion: 'erp_manual' })), /estado de vinculacion/);

  const error = capturarError(() => validarZonaAppBasica(crearZona(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});

test('prepararCampoApp normaliza codigo y marca vinculado si tiene campo ERP', () => {
  const preparado = prepararCampoApp(crearCampo({ campoErpId: 'empresa-1:campo:10', codigoInterno: ' campo   ñu ' }));

  assert.equal(preparado.nombre, 'Estancia Ñandú');
  assert.equal(preparado.codigoInterno, 'CAMPO NU');
  assert.equal(preparado.estadoVinculacion, 'vinculado_erp');
});

test('validarCampoAppBasico exige cliente, empresa, nombre y alcance por cliente', () => {
  assert.doesNotThrow(() => validarCampoAppBasico(crearCampo(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarCampoAppBasico(crearCampo({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarCampoAppBasico(crearCampo({ empresaErpId: '' })), /empresaErpId/);
  assert.throws(() => validarCampoAppBasico(crearCampo({ nombre: '   ' })), /nombre/);

  const error = capturarError(() => validarCampoAppBasico(crearCampo(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});

test('obtenerIdZonaDesdeErpId extrae id numerico de claves ERP de zona', () => {
  assert.equal(obtenerIdZonaDesdeErpId('empresa-1:zona:15'), 15);
  assert.equal(obtenerIdZonaDesdeErpId('zona-sin-id'), undefined);
});

test('prepararLoteApp normaliza codigo, superficies numericas y estado ERP', () => {
  const preparado = prepararLoteApp(crearLote({
    loteErpId: 'empresa-1:lote:5',
    superficieTotal: '120.5',
    superficieProductiva: '100.25',
  }));

  assert.equal(preparado.nombre, 'Lote Sur');
  assert.equal(preparado.codigoInterno, 'LOTE SUR');
  assert.equal(preparado.superficieTotal, 120.5);
  assert.equal(preparado.superficieProductiva, 100.25);
  assert.equal(preparado.estadoVinculacion, 'vinculado_erp');
});

test('validarLoteAppBasico exige cliente, campo, nombre y superficies consistentes', () => {
  assert.doesNotThrow(() => validarLoteAppBasico(crearLote(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarLoteAppBasico(crearLote({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarLoteAppBasico(crearLote({ campoAppId: '' })), /campo propio/);
  assert.throws(() => validarLoteAppBasico(crearLote({ nombre: '   ' })), /nombre/);
  assert.throws(() => validarLoteAppBasico(crearLote({ superficieTotal: Number.NaN })), /superficie total/);
  assert.throws(() => validarLoteAppBasico(crearLote({ superficieProductiva: -1 })), /superficie productiva/);
  assert.throws(() => validarLoteAppBasico(crearLote({ superficieTotal: 10, superficieProductiva: 11 })), /no puede superar/);

  const error = capturarError(() => validarLoteAppBasico(crearLote(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});

test('prepararEspecieApp fuerza empresa global, codigo y estado segun especie ERP', () => {
  const preparada = prepararEspecieApp(crearEspecie({ especieErpId: 'global:especie:1' }));

  assert.equal(preparada.empresaErpId, 'global');
  assert.equal(preparada.nombre, 'Maíz temprano');
  assert.equal(preparada.codigoInterno, 'MAIZ TEMPRANO');
  assert.equal(preparada.estadoVinculacion, 'vinculado_erp');
});

test('validarEspecieAppBasica exige cliente, nombre y alcance por cliente', () => {
  assert.doesNotThrow(() => validarEspecieAppBasica(crearEspecie(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarEspecieAppBasica(crearEspecie({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarEspecieAppBasica(crearEspecie({ nombre: '   ' })), /nombre/);

  const error = capturarError(() => validarEspecieAppBasica(crearEspecie(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});
