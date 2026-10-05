const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearArchivoGeograficoLote,
  prepararArchivoGeograficoParaGuardar,
} = require('../apps/api/dist/services/lotes/archivosGeograficosLotes');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');
const geoJson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { nombre: 'Lote Norte' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-58, -34],
        [-58.001, -34],
        [-58.001, -34.001],
        [-58, -34.001],
        [-58, -34],
      ]],
    },
  }],
};

function configurarStorage() {
  process.env.SUPABASE_URL = 'https://supabase.test/';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.LOTE_GEOGRAFIA_MAX_BYTES = String(2 * 1024 * 1024);
}

function crearArchivoRow(overrides = {}) {
  return {
    id: 'archivo-1',
    clienteId: 'cliente-1',
    loteAppId: 'lote-1',
    nombreArchivo: 'Lote Norte.kml',
    tipo: 'kml',
    mimeType: 'text/xml',
    tamanioBytes: 2048,
    storageBucket: 'lotes-geograficos',
    storagePath: 'cliente-1/lotes/lote-1/archivo-1.kml',
    estado: 'procesado',
    esPrincipal: true,
    geometriaGeoJson: geoJson,
    superficieCalculadaHa: 12.35,
    observaciones: 'Procesado ok',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
}

function crearArchivoRequest(overrides = {}) {
  return {
    id: 'archivo-1',
    clienteId: 'otro-cliente',
    loteAppId: 'otro-lote',
    nombreArchivo: '  Lote   Norte.KML  ',
    tipo: 'kmz',
    mimeType: ' TEXT/XML ',
    tamanioBytes: 2048,
    storageBucket: 'lotes-geograficos',
    storagePath: 'cliente-1/lotes/lote-1/archivo-1.kml',
    estado: 'pendiente_procesamiento',
    esPrincipal: true,
    createdAt: fechaBase.toISOString(),
    updatedAt: fechaBase.toISOString(),
    ...overrides,
  };
}

test('mapearArchivoGeograficoLote serializa archivo procesado', () => {
  const archivo = mapearArchivoGeograficoLote(crearArchivoRow());

  assert.equal(archivo.id, 'archivo-1');
  assert.equal(archivo.clienteId, 'cliente-1');
  assert.equal(archivo.loteAppId, 'lote-1');
  assert.equal(archivo.nombreArchivo, 'Lote Norte.kml');
  assert.equal(archivo.tipo, 'kml');
  assert.equal(archivo.mimeType, 'text/xml');
  assert.equal(archivo.tamanioBytes, 2048);
  assert.equal(archivo.estado, 'procesado');
  assert.equal(archivo.esPrincipal, true);
  assert.deepEqual(archivo.geometriaGeoJson, geoJson);
  assert.equal(archivo.superficieCalculadaHa, 12.35);
  assert.equal(archivo.observaciones, 'Procesado ok');
  assert.equal(archivo.createdAt, fechaBase.toISOString());
  assert.equal(archivo.updatedAt, fechaBase.toISOString());
});

test('mapearArchivoGeograficoLote omite opcionales nulos', () => {
  const archivo = mapearArchivoGeograficoLote(crearArchivoRow({
    geometriaGeoJson: null,
    superficieCalculadaHa: null,
    observaciones: null,
  }));

  assert.equal(archivo.geometriaGeoJson, undefined);
  assert.equal(archivo.superficieCalculadaHa, undefined);
  assert.equal(archivo.observaciones, undefined);
});

test('prepararArchivoGeograficoParaGuardar respeta geometria ya informada', async () => {
  configurarStorage();
  const llamadas = [];
  const archivo = await prepararArchivoGeograficoParaGuardar(
    'lote-1',
    crearArchivoRequest({
      geometriaGeoJson: geoJson,
      superficieCalculadaHa: 12.35,
      observaciones: 'Geometria validada externamente',
    }),
    'cliente-1',
    {
      procesarArchivoGeografico: async (archivoParaProcesar) => {
        llamadas.push(archivoParaProcesar);
        return { geoJson, superficieCalculadaHa: 99 };
      },
    },
  );

  assert.deepEqual(llamadas, []);
  assert.equal(archivo.clienteId, 'cliente-1');
  assert.equal(archivo.loteAppId, 'lote-1');
  assert.equal(archivo.nombreArchivo, 'Lote Norte.KML');
  assert.equal(archivo.tipo, 'kml');
  assert.equal(archivo.mimeType, 'text/xml');
  assert.equal(archivo.estado, 'pendiente_procesamiento');
  assert.deepEqual(archivo.geometriaGeoJson, geoJson);
  assert.equal(archivo.superficieCalculadaHa, 12.35);
});

test('prepararArchivoGeograficoParaGuardar procesa automaticamente y redondea superficie', async () => {
  configurarStorage();
  const archivo = await prepararArchivoGeograficoParaGuardar(
    'lote-1',
    crearArchivoRequest({ observaciones: undefined }),
    'cliente-1',
    {
      procesarArchivoGeografico: async () => ({
        geoJson,
        superficieCalculadaHa: 12.345,
      }),
    },
  );

  assert.equal(archivo.estado, 'procesado');
  assert.deepEqual(archivo.geometriaGeoJson, geoJson);
  assert.equal(archivo.superficieCalculadaHa, 12.35);
  assert.equal(archivo.observaciones, 'Archivo geografico procesado automaticamente.');
});

test('prepararArchivoGeograficoParaGuardar marca rechazado si falla el procesamiento', async () => {
  configurarStorage();
  const archivo = await prepararArchivoGeograficoParaGuardar(
    'lote-1',
    crearArchivoRequest(),
    'cliente-1',
    {
      procesarArchivoGeografico: async () => {
        throw new Error('No se encontraron geometrias validas en el archivo.');
      },
    },
  );

  assert.equal(archivo.estado, 'rechazado');
  assert.equal(archivo.geometriaGeoJson, undefined);
  assert.equal(archivo.superficieCalculadaHa, undefined);
  assert.equal(archivo.observaciones, 'No se encontraron geometrias validas en el archivo.');
});
