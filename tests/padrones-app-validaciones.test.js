const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizarCodigo,
  obtenerIdZonaDesdeErpId,
  prepararCampoApp,
  prepararEspecieApp,
  prepararActividadApp,
  prepararInsumoApp,
  prepararLoteApp,
  prepararServicioApp,
  prepararZonaApp,
  validarCampoAppBasico,
  validarEspecieAppBasica,
  validarActividadAppBasica,
  validarInsumoAppBasico,
  validarLoteAppBasico,
  validarServicioAppBasico,
  validarZonaAppBasica,
  obtenerIdEspecieDesdeErpId,
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

function crearActividad(overrides = {}) {
  return {
    id: 'actividad-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    especieAppId: 'especie-1',
    nombre: '  Soja   primera  ',
    tipoGrano: 'gruesa',
    tipoCultivo: 'primera',
    epocaSiembra: 'verano',
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearInsumo(overrides = {}) {
  return {
    id: 'insumo-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    nombre: '  Herbicida   Ñ  ',
    tipo: '  Herbicida   residual  ',
    unidad: ' l ',
    moneda: ' usd ',
    precioUnitarioEstimado: 12.5,
    estadoVinculacion: 'provisorio',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearServicio(overrides = {}) {
  return {
    id: 'servicio-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    codigo: '',
    nombre: '  Pulverización   terrestre  ',
    descripcionAbreviada: '  Aplicación   contratada  ',
    unidadSugerida: '',
    costoUnitarioSugerido: 18,
    estadoVinculacion: 'provisorio',
    activo: true,
    origen: 'provisorio',
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

test('prepararActividadApp normaliza codigo, omite catalogos vacios y marca vinculacion ERP', () => {
  const preparada = prepararActividadApp(crearActividad({
    actividadErpId: 'global:actividad:7',
    codigoInterno: ' soja   ñ ',
    tipoGrano: '',
    tipoCultivo: '',
    epocaSiembra: '',
  }));

  assert.equal(preparada.empresaErpId, 'global');
  assert.equal(preparada.nombre, 'Soja primera');
  assert.equal(preparada.codigoInterno, 'SOJA N');
  assert.equal(preparada.tipoGrano, undefined);
  assert.equal(preparada.tipoCultivo, undefined);
  assert.equal(preparada.epocaSiembra, undefined);
  assert.equal(preparada.estadoVinculacion, 'vinculado_erp');
});

test('validarActividadAppBasica exige especie y catalogos validos', () => {
  assert.doesNotThrow(() => validarActividadAppBasica(crearActividad(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarActividadAppBasica(crearActividad({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarActividadAppBasica(crearActividad({ nombre: '   ' })), /nombre/);
  assert.throws(() => validarActividadAppBasica(crearActividad({ especieAppId: undefined, especieErpId: undefined })), /asociada a una especie/);
  assert.throws(() => validarActividadAppBasica(crearActividad({ tipoGrano: 'mixta' })), /tipo de grano/);
  assert.throws(() => validarActividadAppBasica(crearActividad({ tipoCultivo: 'tercera' })), /tipo de cultivo/);
  assert.throws(() => validarActividadAppBasica(crearActividad({ epocaSiembra: 'otono' })), /epoca de siembra/);

  const error = capturarError(() => validarActividadAppBasica(crearActividad(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});

test('obtenerIdEspecieDesdeErpId extrae id numerico de claves ERP de especie', () => {
  assert.equal(obtenerIdEspecieDesdeErpId('global:especie:12'), 12);
  assert.equal(obtenerIdEspecieDesdeErpId('especie-sin-id'), undefined);
});

test('prepararInsumoApp normaliza codigo, tipo, unidad, moneda y estado ERP', () => {
  const preparado = prepararInsumoApp(crearInsumo({ insumoErpId: 'global:insumo:4' }));

  assert.equal(preparado.empresaErpId, 'global');
  assert.equal(preparado.nombre, 'Herbicida Ñ');
  assert.equal(preparado.codigoInterno, 'HERBICIDA N');
  assert.equal(preparado.tipo, 'Herbicida residual');
  assert.equal(preparado.unidad, 'l');
  assert.equal(preparado.moneda, 'USD');
  assert.equal(preparado.estadoVinculacion, 'vinculado_erp');
});

test('validarInsumoAppBasico exige cliente, empresa, nombre, unidad y precio no negativo', () => {
  assert.doesNotThrow(() => validarInsumoAppBasico(crearInsumo(), { clienteId: 'cliente-1' }));
  assert.throws(() => validarInsumoAppBasico(crearInsumo({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarInsumoAppBasico(crearInsumo({ empresaErpId: '' })), /empresaErpId/);
  assert.throws(() => validarInsumoAppBasico(crearInsumo({ nombre: '   ' })), /nombre/);
  assert.throws(() => validarInsumoAppBasico(crearInsumo({ unidad: '   ' })), /unidad/);
  assert.throws(() => validarInsumoAppBasico(crearInsumo({ precioUnitarioEstimado: -0.01 })), /precio estimado/);

  const error = capturarError(() => validarInsumoAppBasico(crearInsumo(), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});

test('prepararServicioApp normaliza codigo, descripcion, unidad, origen y vinculacion', () => {
  const preparado = prepararServicioApp(crearServicio({ servicioErpId: 'global:servicio:8' }));

  assert.equal(preparado.empresaErpId, 'global');
  assert.equal(preparado.codigo, 'PULVERIZACION TERRESTRE');
  assert.equal(preparado.nombre, 'Pulverización terrestre');
  assert.equal(preparado.descripcionAbreviada, 'Aplicación contratada');
  assert.equal(preparado.unidadSugerida, 'Ha');
  assert.equal(preparado.estadoVinculacion, 'vinculado_erp');
  assert.equal(preparado.origen, 'erp');
});

test('validarServicioAppBasico exige cliente, codigo, nombre, unidad y costo no negativo', () => {
  assert.doesNotThrow(() => validarServicioAppBasico(prepararServicioApp(crearServicio()), { clienteId: 'cliente-1' }));
  assert.throws(() => validarServicioAppBasico(crearServicio({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarServicioAppBasico(crearServicio({ codigo: '' })), /codigo/);
  assert.throws(() => validarServicioAppBasico(crearServicio({ codigo: 'LAB', nombre: '   ' })), /nombre/);
  assert.throws(() => validarServicioAppBasico(crearServicio({ codigo: 'LAB', unidadSugerida: '   ' })), /unidad sugerida/);
  assert.throws(() => validarServicioAppBasico(crearServicio({ codigo: 'LAB', unidadSugerida: 'Ha', costoUnitarioSugerido: -1 })), /costo sugerido/);

  const error = capturarError(() => validarServicioAppBasico(prepararServicioApp(crearServicio()), { clienteId: 'cliente-2' }));
  assert.match(error.message, /otro cliente/);
  assert.equal(error.statusCode, 403);
});
