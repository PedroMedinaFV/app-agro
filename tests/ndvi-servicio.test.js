const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearMapaNdvi,
  seleccionarUltimoMapaNdvi,
  validarAlcanceCampoNdvi,
} = require('../apps/api/dist/services/ndvi/mapasNdviPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');
const fechaProcesamiento = new Date('2026-10-01T13:00:00.000Z');

function crearMapaNdviRow(overrides = {}) {
  return {
    id: 'mapa-1',
    clienteId: 'cliente-1',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:1',
    campaniaErpId: 'campania-26',
    fechaImagen: fechaBase,
    fechaProcesamiento,
    proveedor: 'Sentinel Hub',
    origen: 'proveedor_api',
    resolucionMetros: 10,
    nubosidadPorcentaje: 12.5,
    ndviPromedio: 0.63,
    ndviMinimo: 0.12,
    ndviMaximo: 0.91,
    ndviDesvio: 0.08,
    superficieAnalizadaHa: 120.5,
    storageBucket: 'ndvi',
    storagePathRaster: 'rasters/mapa-1.tif',
    storagePathPreview: 'previews/mapa-1.png',
    storagePathTiles: 'tiles/mapa-1',
    bboxGeoJson: { type: 'Polygon', coordinates: [] },
    metadata: { satelite: 'sentinel-2' },
    estado: 'procesado',
    activo: true,
    createdAt: fechaBase,
    updatedAt: fechaProcesamiento,
    ...overrides,
  };
}

function crearMapa(overrides = {}) {
  return mapearMapaNdvi(crearMapaNdviRow(overrides));
}

function crearDeps(camposAsignados, llamadas = []) {
  return {
    obtenerCamposAsignados: async (usuario) => {
      llamadas.push(usuario);
      return camposAsignados;
    },
  };
}

async function capturarErrorAsync(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }

  throw new Error('Se esperaba que la funcion lanzara un error.');
}

test('mapearMapaNdvi serializa mapa con indicadores y storage', () => {
  const mapa = crearMapa();

  assert.equal(mapa.id, 'mapa-1');
  assert.equal(mapa.loteErpId, 'empresa:1:lote:1');
  assert.equal(mapa.campoErpId, 'empresa:1:campo:1');
  assert.equal(mapa.campaniaErpId, 'campania-26');
  assert.equal(mapa.fechaImagen, fechaBase.toISOString());
  assert.equal(mapa.fechaProcesamiento, fechaProcesamiento.toISOString());
  assert.equal(mapa.proveedor, 'Sentinel Hub');
  assert.equal(mapa.origen, 'proveedor_api');
  assert.equal(mapa.resolucionMetros, 10);
  assert.equal(mapa.nubosidadPorcentaje, 12.5);
  assert.equal(mapa.ndviPromedio, 0.63);
  assert.equal(mapa.ndviMinimo, 0.12);
  assert.equal(mapa.ndviMaximo, 0.91);
  assert.equal(mapa.ndviDesvio, 0.08);
  assert.equal(mapa.superficieAnalizadaHa, 120.5);
  assert.equal(mapa.storageBucket, 'ndvi');
  assert.equal(mapa.storagePathRaster, 'rasters/mapa-1.tif');
  assert.deepEqual(mapa.metadata, { satelite: 'sentinel-2' });
  assert.equal(mapa.estado, 'procesado');
});

test('mapearMapaNdvi omite nulos como undefined', () => {
  const mapa = crearMapa({
    loteErpId: null,
    campoErpId: null,
    campaniaErpId: null,
    fechaProcesamiento: null,
    resolucionMetros: null,
    nubosidadPorcentaje: null,
    ndviPromedio: null,
    ndviMinimo: null,
    ndviMaximo: null,
    ndviDesvio: null,
    superficieAnalizadaHa: null,
    storageBucket: null,
    storagePathRaster: null,
    storagePathPreview: null,
    storagePathTiles: null,
    bboxGeoJson: null,
    metadata: null,
  });

  assert.equal(mapa.loteErpId, undefined);
  assert.equal(mapa.campoErpId, undefined);
  assert.equal(mapa.campaniaErpId, undefined);
  assert.equal(mapa.fechaProcesamiento, undefined);
  assert.equal(mapa.resolucionMetros, undefined);
  assert.equal(mapa.nubosidadPorcentaje, undefined);
  assert.equal(mapa.ndviPromedio, undefined);
  assert.equal(mapa.ndviMinimo, undefined);
  assert.equal(mapa.ndviMaximo, undefined);
  assert.equal(mapa.ndviDesvio, undefined);
  assert.equal(mapa.superficieAnalizadaHa, undefined);
  assert.equal(mapa.storageBucket, undefined);
  assert.equal(mapa.storagePathRaster, undefined);
  assert.equal(mapa.storagePathPreview, undefined);
  assert.equal(mapa.storagePathTiles, undefined);
  assert.equal(mapa.bboxGeoJson, undefined);
  assert.equal(mapa.metadata, undefined);
});

test('seleccionarUltimoMapaNdvi prioriza procesado sobre primer historial', () => {
  const pendiente = crearMapa({ id: 'mapa-pendiente', estado: 'pendiente_procesamiento' });
  const procesado = crearMapa({ id: 'mapa-procesado', estado: 'procesado' });

  assert.equal(seleccionarUltimoMapaNdvi([pendiente, procesado]), procesado);
});

test('seleccionarUltimoMapaNdvi usa primer mapa cuando no hay procesados', () => {
  const pendiente = crearMapa({ id: 'mapa-pendiente', estado: 'pendiente_procesamiento' });
  const rechazado = crearMapa({ id: 'mapa-rechazado', estado: 'rechazado' });

  assert.equal(seleccionarUltimoMapaNdvi([pendiente, rechazado]), pendiente);
  assert.equal(seleccionarUltimoMapaNdvi([]), undefined);
});

test('validarAlcanceCampoNdvi permite acceso global cuando asignaciones es null', async () => {
  const llamadas = [];

  await validarAlcanceCampoNdvi(
    { id: 'planificador-1', rol: 'planificador', clienteId: 'cliente-1' },
    null,
    crearDeps(null, llamadas),
  );

  assert.deepEqual(llamadas, [{
    sub: 'planificador-1',
    rol: 'planificador',
    clienteId: 'cliente-1',
  }]);
});

test('validarAlcanceCampoNdvi permite campo asignado y bloquea no asignado', async () => {
  await validarAlcanceCampoNdvi(
    { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
    'empresa:1:campo:1',
    crearDeps(['empresa:1:campo:1']),
  );

  const error = await capturarErrorAsync(
    () => validarAlcanceCampoNdvi(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      'empresa:1:campo:2',
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});

test('validarAlcanceCampoNdvi bloquea campos sin erpId para operadores restringidos', async () => {
  const error = await capturarErrorAsync(
    () => validarAlcanceCampoNdvi(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      null,
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});
