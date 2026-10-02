const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarCierreRecorrida,
  validarDatosBasicosRecorrida,
} = require('../apps/api/dist/services/recorridas/validacionesRecorridas');
const {
  validarAdjuntosObservacion,
  validarDatosBasicosObservacion,
} = require('../apps/api/dist/services/observaciones/validacionesObservaciones');

function crearRecorrida(overrides = {}) {
  return {
    campoAppId: 'campo-1',
    titulo: '  Recorrida lote norte  ',
    objetivo: 'plagas',
    estado: 'en_curso',
    fechaInicio: '2026-10-01T10:00:00.000Z',
    observaciones: '  revisar borde sur  ',
    origen: 'web',
    ...overrides,
  };
}

function crearObservacion(overrides = {}) {
  return {
    campoAppId: 'campo-1',
    loteAppId: 'lote-1',
    titulo: '  Mancha foliar  ',
    descripcion: '  Hallazgo sobre cabecera  ',
    severidad: 'media',
    latitud: -34.12345,
    longitud: -58.12345,
    fechaEvento: '2026-10-01T10:00:00.000Z',
    origen: 'mobile',
    ...overrides,
  };
}

test('validarDatosBasicosRecorrida normaliza titulo, defaults y observaciones', () => {
  const resultado = validarDatosBasicosRecorrida(crearRecorrida({
    objetivo: undefined,
    estado: undefined,
  }));

  assert.equal(resultado.titulo, 'Recorrida lote norte');
  assert.equal(resultado.objetivo, 'monitoreo_general');
  assert.equal(resultado.estado, 'en_curso');
  assert.equal(resultado.fechaInicio.toISOString(), '2026-10-01T10:00:00.000Z');
  assert.equal(resultado.observaciones, 'revisar borde sur');
});

test('validarDatosBasicosRecorrida rechaza objetivo y estado inicial invalidos', () => {
  assert.throws(() => validarDatosBasicosRecorrida(crearRecorrida({ objetivo: 'objetivo-raro' })), /objetivo de la recorrida no es valido/);
  assert.throws(() => validarDatosBasicosRecorrida(crearRecorrida({ estado: 'cerrada' })), /estado inicial de la recorrida no es valido/);
});

test('validarCierreRecorrida rechaza recorridas cerradas o canceladas y fecha invalida', () => {
  assert.throws(() => validarCierreRecorrida('cerrada'), /ya no se puede cerrar/);
  assert.throws(() => validarCierreRecorrida('cancelada'), /ya no se puede cerrar/);
  assert.throws(() => validarCierreRecorrida('en_curso', 'fecha-rara'), /fecha de cierre no es valida/);
  assert.equal(validarCierreRecorrida('en_curso', '2026-10-01T12:00:00.000Z').toISOString(), '2026-10-01T12:00:00.000Z');
});

test('validarDatosBasicosObservacion normaliza textos y exige coordenadas completas', () => {
  const resultado = validarDatosBasicosObservacion(crearObservacion());

  assert.equal(resultado.titulo, 'Mancha foliar');
  assert.equal(resultado.descripcion, 'Hallazgo sobre cabecera');
  assert.equal(resultado.severidad, 'media');
  assert.equal(resultado.fechaEvento.toISOString(), '2026-10-01T10:00:00.000Z');

  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ longitud: undefined })), /Latitud y longitud deben informarse juntas/);
});

test('validarDatosBasicosObservacion rechaza coordenadas, severidad, origen y fecha invalidos', () => {
  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ latitud: -91 })), /latitud no es valida/);
  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ longitud: 181 })), /longitud no es valida/);
  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ severidad: 'critica' })), /severidad de la observacion no es valida/);
  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ origen: 'excel' })), /origen de la observacion no es valido/);
  assert.throws(() => validarDatosBasicosObservacion(crearObservacion({ fechaEvento: 'ayer' })), /fecha del evento no es valida/);
});

test('validarAdjuntosObservacion normaliza bucket, nombre, mime y estado default', () => {
  const adjuntos = validarAdjuntosObservacion([{
    storageBucket: '',
    storagePath: 'cliente-1/obs-1/foto.jpg',
    nombreArchivo: '  Foto cultivo.JPG  ',
    mimeType: 'IMAGE/JPEG',
    tamanioBytes: 1024,
  }]);

  assert.deepEqual(adjuntos, [{
    storageBucket: 'observaciones',
    storagePath: 'cliente-1/obs-1/foto.jpg',
    nombreArchivo: 'Foto cultivo.JPG',
    mimeType: 'image/jpeg',
    tamanioBytes: 1024,
    checksumSha256: null,
    estado: 'disponible',
  }]);
});

test('validarAdjuntosObservacion rechaza rutas peligrosas, mime no permitido y checksum invalido', () => {
  const base = {
    storageBucket: 'observaciones',
    storagePath: 'cliente-1/obs-1/foto.jpg',
    nombreArchivo: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanioBytes: 1024,
  };

  assert.throws(() => validarAdjuntosObservacion([{ ...base, storagePath: '../secretos/foto.jpg' }]), /ruta de storage del adjunto no es valida/);
  assert.throws(() => validarAdjuntosObservacion([{ ...base, mimeType: 'application/pdf' }]), /tipo de archivo del adjunto no esta permitido/);
  assert.throws(() => validarAdjuntosObservacion([{ ...base, checksumSha256: 'abc' }]), /checksum del adjunto no es valido/);
});
