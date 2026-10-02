const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const {
  encodeStoragePath: encodeStoragePathAdjunto,
  normalizarSignedUploadUrl: normalizarSignedUploadUrlAdjunto,
  obtenerExtensionSegura,
  validarArchivo: validarArchivoAdjunto,
} = require('../apps/api/dist/services/observaciones/adjuntosStorage');
const {
  calcularSuperficieGeoJsonHa,
  cerrarAnillo,
  encodeStoragePath: encodeStoragePathGeo,
  extraerKmlDesdeKmz,
  leerCoordenadasKml,
  normalizarSignedUploadUrl: normalizarSignedUploadUrlGeo,
  obtenerTipoArchivo,
  parsearKmlAGeoJson,
  validarArchivo: validarArchivoGeografico,
} = require('../apps/api/dist/services/lotes/archivosGeograficosLotes');

function configurarStorage() {
  process.env.SUPABASE_URL = 'https://supabase.test/';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.OBSERVACION_ADJUNTO_MAX_BYTES = String(5 * 1024 * 1024);
  process.env.LOTE_GEOGRAFIA_MAX_BYTES = String(2 * 1024 * 1024);
}

function crearZipSinCompresion(nombre, contenido) {
  const nombreBuffer = Buffer.from(nombre);
  const contenidoBuffer = Buffer.from(contenido);
  const local = Buffer.alloc(30 + nombreBuffer.length + contenidoBuffer.length);
  let offset = 0;

  local.writeUInt32LE(0x04034b50, offset); offset += 4;
  local.writeUInt16LE(20, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt32LE(0, offset); offset += 4;
  local.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  local.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  local.writeUInt16LE(nombreBuffer.length, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  nombreBuffer.copy(local, offset); offset += nombreBuffer.length;
  contenidoBuffer.copy(local, offset);

  const central = Buffer.alloc(46 + nombreBuffer.length);
  offset = 0;
  central.writeUInt32LE(0x02014b50, offset); offset += 4;
  central.writeUInt16LE(20, offset); offset += 2;
  central.writeUInt16LE(20, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt32LE(0, offset); offset += 4;
  central.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  central.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  central.writeUInt16LE(nombreBuffer.length, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt32LE(0, offset); offset += 4;
  central.writeUInt32LE(0, offset); offset += 4;
  nombreBuffer.copy(central, offset);

  const eocd = Buffer.alloc(22);
  offset = 0;
  eocd.writeUInt32LE(0x06054b50, offset); offset += 4;
  eocd.writeUInt16LE(0, offset); offset += 2;
  eocd.writeUInt16LE(0, offset); offset += 2;
  eocd.writeUInt16LE(1, offset); offset += 2;
  eocd.writeUInt16LE(1, offset); offset += 2;
  eocd.writeUInt32LE(central.length, offset); offset += 4;
  eocd.writeUInt32LE(local.length, offset);

  return Buffer.concat([local, central, eocd]);
}

function crearZipDeflate(nombre, contenido) {
  const nombreBuffer = Buffer.from(nombre);
  const contenidoBuffer = Buffer.from(contenido);
  const comprimido = zlib.deflateRawSync(contenidoBuffer);
  const local = Buffer.alloc(30 + nombreBuffer.length + comprimido.length);
  let offset = 0;

  local.writeUInt32LE(0x04034b50, offset); offset += 4;
  local.writeUInt16LE(20, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt16LE(8, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  local.writeUInt32LE(0, offset); offset += 4;
  local.writeUInt32LE(comprimido.length, offset); offset += 4;
  local.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  local.writeUInt16LE(nombreBuffer.length, offset); offset += 2;
  local.writeUInt16LE(0, offset); offset += 2;
  nombreBuffer.copy(local, offset); offset += nombreBuffer.length;
  comprimido.copy(local, offset);

  const central = Buffer.alloc(46 + nombreBuffer.length);
  offset = 0;
  central.writeUInt32LE(0x02014b50, offset); offset += 4;
  central.writeUInt16LE(20, offset); offset += 2;
  central.writeUInt16LE(20, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(8, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt32LE(0, offset); offset += 4;
  central.writeUInt32LE(comprimido.length, offset); offset += 4;
  central.writeUInt32LE(contenidoBuffer.length, offset); offset += 4;
  central.writeUInt16LE(nombreBuffer.length, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt16LE(0, offset); offset += 2;
  central.writeUInt32LE(0, offset); offset += 4;
  central.writeUInt32LE(0, offset); offset += 4;
  nombreBuffer.copy(central, offset);

  const eocd = Buffer.alloc(22);
  offset = 0;
  eocd.writeUInt32LE(0x06054b50, offset); offset += 4;
  eocd.writeUInt16LE(0, offset); offset += 2;
  eocd.writeUInt16LE(0, offset); offset += 2;
  eocd.writeUInt16LE(1, offset); offset += 2;
  eocd.writeUInt16LE(1, offset); offset += 2;
  eocd.writeUInt32LE(central.length, offset); offset += 4;
  eocd.writeUInt32LE(local.length, offset);

  return Buffer.concat([local, central, eocd]);
}

test('validarArchivo de adjunto acepta imagen valida y normaliza nombre y mime', () => {
  configurarStorage();
  const resultado = validarArchivoAdjunto({
    nombreArchivo: '  Foto   lote.PNG  ',
    mimeType: ' IMAGE/PNG ',
    tamanioBytes: 1024,
    checksumSha256: 'a'.repeat(64),
  });

  assert.deepEqual(resultado, {
    nombreArchivo: 'Foto lote.PNG',
    mimeType: 'image/png',
  });
});

test('validarArchivo de adjunto rechaza path traversal, mime, tamano y checksum invalidos', () => {
  configurarStorage();
  assert.throws(() => validarArchivoAdjunto({ nombreArchivo: '../foto.png', mimeType: 'image/png', tamanioBytes: 1 }), /nombre del archivo/);
  assert.throws(() => validarArchivoAdjunto({ nombreArchivo: 'foto.pdf', mimeType: 'application/pdf', tamanioBytes: 1 }), /tipo de archivo/);
  assert.throws(() => validarArchivoAdjunto({ nombreArchivo: 'foto.png', mimeType: 'image/png', tamanioBytes: 0 }), /limite permitido/);
  assert.throws(() => validarArchivoAdjunto({ nombreArchivo: 'foto.png', mimeType: 'image/png', tamanioBytes: 1, checksumSha256: 'xyz' }), /checksum/);
});

test('helpers de storage de adjuntos resuelven extension, path y URL firmada', () => {
  assert.equal(obtenerExtensionSegura('foto.jpeg', 'image/png'), 'png');
  assert.equal(obtenerExtensionSegura('foto.sin-mime', 'application/octet-stream'), 'sin-mime');
  assert.equal(encodeStoragePathAdjunto('cliente 1/foto lote.png'), 'cliente%201/foto%20lote.png');
  assert.equal(normalizarSignedUploadUrlAdjunto('https://supabase.test', { signedURL: '/signed/path' }), 'https://supabase.test/signed/path');
  assert.equal(normalizarSignedUploadUrlAdjunto('https://supabase.test', { url: 'https://cdn.test/file' }), 'https://cdn.test/file');
  assert.throws(() => normalizarSignedUploadUrlAdjunto('https://supabase.test', {}), /URL firmada/);
});

test('validarArchivo geografico detecta tipo por extension o mime y normaliza datos', () => {
  configurarStorage();

  assert.deepEqual(validarArchivoGeografico({
    nombreArchivo: '  Lote   Norte.KML  ',
    mimeType: ' text/xml ',
    tamanioBytes: 1024,
  }), {
    nombreArchivo: 'Lote Norte.KML',
    mimeType: 'text/xml',
    tipo: 'kml',
  });

  assert.equal(obtenerTipoArchivo('mapa.bin', 'application/vnd.google-earth.kmz'), 'kmz');
});

test('validarArchivo geografico rechaza nombre, tipo, tamano y checksum invalidos', () => {
  configurarStorage();
  assert.throws(() => validarArchivoGeografico({ nombreArchivo: 'carpeta/lote.kml', mimeType: 'text/xml', tamanioBytes: 1 }), /nombre del archivo geografico/);
  assert.throws(() => validarArchivoGeografico({ nombreArchivo: 'lote.txt', mimeType: 'text/plain', tamanioBytes: 1 }), /KML o KMZ|tipo de archivo geografico/);
  assert.throws(() => validarArchivoGeografico({ nombreArchivo: 'lote.kml', mimeType: 'text/xml', tamanioBytes: 0 }), /limite permitido/);
  assert.throws(() => validarArchivoGeografico({ nombreArchivo: 'lote.kml', mimeType: 'text/xml', tamanioBytes: 1, checksumSha256: 'nope' }), /checksum/);
});

test('helpers de KML parsean coordenadas, cierran anillos y calculan superficie', () => {
  const coordenadas = leerCoordenadasKml('-58,-34,10 -58.001,-34 -58.001,-34.001');
  const anillo = cerrarAnillo(coordenadas);

  assert.equal(coordenadas.length, 3);
  assert.deepEqual(anillo[0], anillo[anillo.length - 1]);

  const geoJson = parsearKmlAGeoJson(`
    <kml><Document><Placemark><name>Lote A</name><Polygon><outerBoundaryIs><LinearRing>
      <coordinates>-58,-34 -58.001,-34 -58.001,-34.001 -58,-34.001 -58,-34</coordinates>
    </LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>
  `);

  assert.equal(geoJson.type, 'FeatureCollection');
  assert.equal(geoJson.features.length, 1);
  assert.equal(geoJson.features[0].geometry.type, 'Polygon');
  assert.ok(calcularSuperficieGeoJsonHa(geoJson) > 0);
});

test('extraerKmlDesdeKmz lee KML interno sin compresion y con deflate', () => {
  const kml = '<kml><Document /></kml>';

  assert.equal(extraerKmlDesdeKmz(crearZipSinCompresion('doc.kml', kml)), kml);
  assert.equal(extraerKmlDesdeKmz(crearZipDeflate('doc.kml', kml)), kml);
  assert.throws(() => extraerKmlDesdeKmz(Buffer.from('no zip')), /estructura ZIP valida/);
});

test('helpers de storage geografico codifican paths y normalizan URL firmada', () => {
  assert.equal(encodeStoragePathGeo('cliente 1/lotes/lote.kml'), 'cliente%201/lotes/lote.kml');
  assert.equal(normalizarSignedUploadUrlGeo('https://supabase.test', { signedUrl: '/signed/path' }), 'https://supabase.test/signed/path');
  assert.throws(() => normalizarSignedUploadUrlGeo('https://supabase.test', {}), /URL firmada/);
});
