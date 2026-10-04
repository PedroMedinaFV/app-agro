const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearPrecipitacionCampo,
  validarAlcanceCampoPrecipitacion,
} = require('../apps/api/dist/services/precipitaciones/precipitacionesPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearPrecipitacionRow(overrides = {}) {
  return {
    id: 'precipitacion-1',
    clienteId: 'cliente-1',
    usuarioId: 'usuario-1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:1',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:1',
    registroMovilId: 'movil-1',
    milimetros: 42.5,
    fechaEvento: fechaBase,
    observaciones: 'Lluvia intensa',
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

test('mapearPrecipitacionCampo serializa precipitacion con opcionales', () => {
  const precipitacion = mapearPrecipitacionCampo(crearPrecipitacionRow());

  assert.equal(precipitacion.id, 'precipitacion-1');
  assert.equal(precipitacion.usuarioId, 'usuario-1');
  assert.equal(precipitacion.campoErpId, 'empresa:1:campo:1');
  assert.equal(precipitacion.loteErpId, 'empresa:1:lote:1');
  assert.equal(precipitacion.registroMovilId, 'movil-1');
  assert.equal(precipitacion.milimetros, 42.5);
  assert.equal(precipitacion.fechaEvento, fechaBase.toISOString());
  assert.equal(precipitacion.observaciones, 'Lluvia intensa');
  assert.equal(precipitacion.origen, 'mobile');
});

test('mapearPrecipitacionCampo omite nulos como undefined', () => {
  const precipitacion = mapearPrecipitacionCampo(crearPrecipitacionRow({
    usuarioId: null,
    campoErpId: null,
    loteAppId: null,
    loteErpId: null,
    registroMovilId: null,
    observaciones: null,
  }));

  assert.equal(precipitacion.usuarioId, undefined);
  assert.equal(precipitacion.campoErpId, undefined);
  assert.equal(precipitacion.loteAppId, undefined);
  assert.equal(precipitacion.loteErpId, undefined);
  assert.equal(precipitacion.registroMovilId, undefined);
  assert.equal(precipitacion.observaciones, undefined);
});

test('validarAlcanceCampoPrecipitacion permite admin sin consultar asignaciones', async () => {
  const llamadas = [];

  await validarAlcanceCampoPrecipitacion(
    { id: 'admin-1', rol: 'admin', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:1' },
    crearDeps(['empresa:1:campo:2'], llamadas),
  );

  assert.deepEqual(llamadas, []);
});

test('validarAlcanceCampoPrecipitacion permite acceso global cuando asignaciones es null', async () => {
  const llamadas = [];

  await validarAlcanceCampoPrecipitacion(
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

test('validarAlcanceCampoPrecipitacion permite campo asignado y bloquea no asignado', async () => {
  await validarAlcanceCampoPrecipitacion(
    { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
    { id: 'campo-1', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:1' },
    crearDeps(['empresa:1:campo:1']),
  );

  const error = await capturarErrorAsync(
    () => validarAlcanceCampoPrecipitacion(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-2', clienteId: 'cliente-1', campoErpId: 'empresa:1:campo:2' },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});

test('validarAlcanceCampoPrecipitacion bloquea campos sin erpId para operadores restringidos', async () => {
  const error = await capturarErrorAsync(
    () => validarAlcanceCampoPrecipitacion(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      { id: 'campo-1', clienteId: 'cliente-1', campoErpId: null },
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});
