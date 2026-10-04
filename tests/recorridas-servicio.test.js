const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearObservacionRecorrida,
  mapearRecorridaCampo,
  validarAlcanceCampoRecorrida,
} = require('../apps/api/dist/services/recorridas/recorridasPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearRecorridaRow(overrides = {}) {
  return {
    id: 'recorrida-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:1',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:1',
    campaniaErpId: 'campania-26',
    titulo: 'Recorrida lote norte',
    objetivo: 'plagas',
    estado: 'en_curso',
    fechaInicio: fechaBase,
    fechaCierre: null,
    observaciones: 'Revisar borde sur',
    origen: 'mobile',
    cantidadObservaciones: 2,
    severidadMaxima: 'alta',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
}

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
    severidad: 'media',
    latitud: -34.12,
    longitud: -58.12,
    fechaEvento: fechaBase,
    origen: 'mobile',
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

test('mapearRecorridaCampo serializa recorrida con opcionales y resumen', () => {
  const recorrida = mapearRecorridaCampo(crearRecorridaRow());

  assert.equal(recorrida.id, 'recorrida-1');
  assert.equal(recorrida.usuarioId, 'usuario-1');
  assert.equal(recorrida.campoErpId, 'empresa:1:campo:1');
  assert.equal(recorrida.loteErpId, 'empresa:1:lote:1');
  assert.equal(recorrida.campaniaErpId, 'campania-26');
  assert.equal(recorrida.objetivo, 'plagas');
  assert.equal(recorrida.estado, 'en_curso');
  assert.equal(recorrida.fechaInicio, fechaBase.toISOString());
  assert.equal(recorrida.fechaCierre, undefined);
  assert.equal(recorrida.cantidadObservaciones, 2);
  assert.equal(recorrida.severidadMaxima, 'alta');
});

test('mapearRecorridaCampo omite nulos como undefined', () => {
  const recorrida = mapearRecorridaCampo(crearRecorridaRow({
    usuarioId: null,
    campoErpId: null,
    loteAppId: null,
    loteErpId: null,
    campaniaErpId: null,
    observaciones: null,
    severidadMaxima: null,
    fechaCierre: fechaBase,
  }));

  assert.equal(recorrida.usuarioId, undefined);
  assert.equal(recorrida.campoErpId, undefined);
  assert.equal(recorrida.loteAppId, undefined);
  assert.equal(recorrida.loteErpId, undefined);
  assert.equal(recorrida.campaniaErpId, undefined);
  assert.equal(recorrida.observaciones, undefined);
  assert.equal(recorrida.severidadMaxima, null);
  assert.equal(recorrida.fechaCierre, fechaBase.toISOString());
});

test('mapearObservacionRecorrida serializa observacion de detalle sin adjuntos', () => {
  const observacion = mapearObservacionRecorrida(crearObservacionRow());

  assert.equal(observacion.id, 'observacion-1');
  assert.equal(observacion.recorridaId, 'recorrida-1');
  assert.equal(observacion.registroMovilId, 'movil-1');
  assert.equal(observacion.severidad, 'media');
  assert.equal(observacion.latitud, -34.12);
  assert.equal(observacion.longitud, -58.12);
  assert.equal(observacion.fechaEvento, fechaBase.toISOString());
  assert.deepEqual(observacion.adjuntos, []);
});

test('validarAlcanceCampoRecorrida permite acceso global cuando asignaciones es null', async () => {
  const llamadas = [];

  await validarAlcanceCampoRecorrida(
    { id: 'admin-1', rol: 'admin', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: null },
    crearDeps(null, llamadas),
  );

  assert.deepEqual(llamadas, [{
    sub: 'admin-1',
    rol: 'admin',
    clienteId: 'cliente-1',
  }]);
});

test('validarAlcanceCampoRecorrida permite campo asignado y bloquea no asignado', async () => {
  await validarAlcanceCampoRecorrida(
    { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:1' },
    crearDeps(['empresa:1:campo:1']),
  );

  const error = await capturarErrorAsync(
    () => validarAlcanceCampoRecorrida(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-2', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:2' },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});

test('validarAlcanceCampoRecorrida bloquea campos sin erpId para operadores restringidos', async () => {
  const error = await capturarErrorAsync(
    () => validarAlcanceCampoRecorrida(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-1', clienteId: 'cliente-1', campoErpId: null },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});
