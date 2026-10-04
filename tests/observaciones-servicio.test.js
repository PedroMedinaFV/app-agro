const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearAdjuntoObservacion,
  mapearObservacionCampo,
  validarAlcanceCampoObservacion,
} = require('../apps/api/dist/services/observaciones/observacionesPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearObservacionRow(overrides = {}) {
  return {
    id: 'observacion-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:1',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:1',
    recorridaId: 'recorrida-1',
    registroMovilId: 'movil-1',
    titulo: 'Mancha foliar',
    descripcion: 'Hallazgo sobre cabecera',
    severidad: 'alta',
    latitud: -34.12,
    longitud: -58.12,
    fechaEvento: fechaBase,
    origen: 'mobile',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
}

function crearAdjuntoRow(overrides = {}) {
  return {
    id: 'adjunto-1',
    clienteId: 'cliente-1',
    observacionId: 'observacion-1',
    storageBucket: 'observaciones',
    storagePath: 'cliente-1/observacion-1/foto.jpg',
    nombreArchivo: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanioBytes: 1024,
    checksumSha256: null,
    estado: 'disponible',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
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

test('mapearAdjuntoObservacion serializa adjunto y omite checksum nulo', () => {
  assert.deepEqual(mapearAdjuntoObservacion(crearAdjuntoRow()), {
    id: 'adjunto-1',
    observacionId: 'observacion-1',
    storageBucket: 'observaciones',
    storagePath: 'cliente-1/observacion-1/foto.jpg',
    nombreArchivo: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanioBytes: 1024,
    checksumSha256: undefined,
    estado: 'disponible',
    createdAt: fechaBase.toISOString(),
    updatedAt: fechaBase.toISOString(),
  });
});

test('mapearObservacionCampo serializa observacion con opcionales y adjuntos', () => {
  const adjunto = mapearAdjuntoObservacion(crearAdjuntoRow({ checksumSha256: 'a'.repeat(64) }));
  const observacion = mapearObservacionCampo(crearObservacionRow(), [adjunto]);

  assert.equal(observacion.id, 'observacion-1');
  assert.equal(observacion.usuarioId, 'usuario-1');
  assert.equal(observacion.campoErpId, 'empresa:1:campo:1');
  assert.equal(observacion.loteErpId, 'empresa:1:lote:1');
  assert.equal(observacion.severidad, 'alta');
  assert.equal(observacion.fechaEvento, fechaBase.toISOString());
  assert.deepEqual(observacion.adjuntos, [adjunto]);
});

test('validarAlcanceCampoObservacion permite admin sin consultar asignaciones', async () => {
  const llamadas = [];

  await validarAlcanceCampoObservacion(
    { id: 'admin-1', rol: 'admin', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:1' },
    crearDeps(['empresa:1:campo:2'], llamadas),
  );

  assert.deepEqual(llamadas, []);
});

test('validarAlcanceCampoObservacion permite acceso global cuando asignaciones es null', async () => {
  const llamadas = [];

  await validarAlcanceCampoObservacion(
    { id: 'planificador-1', rol: 'planificador', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: null },
    crearDeps(null, llamadas),
  );

  assert.deepEqual(llamadas, [{
    sub: 'planificador-1',
    rol: 'planificador',
    clienteId: 'cliente-1',
  }]);
});

test('validarAlcanceCampoObservacion permite campo asignado y bloquea no asignado', async () => {
  await validarAlcanceCampoObservacion(
    { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:1' },
    crearDeps(['empresa:1:campo:1']),
  );

  const error = await capturarErrorAsync(
    () => validarAlcanceCampoObservacion(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-2', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:2' },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});

test('validarAlcanceCampoObservacion bloquea campos sin erpId para operadores restringidos', async () => {
  const error = await capturarErrorAsync(
    () => validarAlcanceCampoObservacion(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-1', clienteId: 'cliente-1', campoErpId: null },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});
