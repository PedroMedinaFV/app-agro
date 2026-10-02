const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buscarMejorCandidato,
  calcularPuntaje,
  describirPuntaje,
  especieErpIdDesdeIdEspecie,
  limpiarTextoVisible,
  normalizarParaComparar,
  obtenerIdDesdeErpId,
  toJsonValue,
  zonaErpIdDesdeIdZona,
} = require('../apps/api/dist/services/notificaciones/vinculacionesSugeridas');

function candidato(overrides = {}) {
  return {
    erpId: 'erp-1',
    empresaErpId: 'empresa-1',
    codigo: 'SOJA',
    nombre: 'Soja primera',
    snapshot: { id: 1 },
    ...overrides,
  };
}

test('normalizarParaComparar limpia espacios, acentos y mayusculas', () => {
  assert.equal(limpiarTextoVisible('  Soja   primera  '), 'Soja primera');
  assert.equal(normalizarParaComparar('  Sojá   primera  '), 'SOJA PRIMERA');
});

test('calcularPuntaje prioriza codigo, nombre y similitudes controladas', () => {
  assert.equal(calcularPuntaje('SOJA', 'SOJA PRIMERA', 'SOJA', 'OTRO'), 100);
  assert.equal(calcularPuntaje('', 'SOJA PRIMERA', 'OTRO', 'SOJA PRIMERA'), 90);
  assert.equal(calcularPuntaje('SOJA PRIMERA', 'OTRO', '', 'SOJA PRIMERA'), 75);
  assert.equal(calcularPuntaje('', 'SOJA PRIMERA', 'SOJA PRIMERA', 'OTRO'), 75);
  assert.equal(calcularPuntaje('', 'SOJA', '', 'SOJA PRIMERA'), 60);
  assert.equal(calcularPuntaje('', 'TRIGO DURO', '', 'TRIGO PAN'), 20);
  assert.equal(calcularPuntaje('', 'MAIZ', '', 'SOJA'), 0);
});

test('describirPuntaje clasifica fuerte, media y baja', () => {
  assert.equal(describirPuntaje(100), 'coincidencia fuerte por codigo o nombre');
  assert.equal(describirPuntaje(90), 'coincidencia fuerte por codigo o nombre');
  assert.equal(describirPuntaje(60), 'coincidencia media por similitud');
  assert.equal(describirPuntaje(50), 'coincidencia baja');
});

test('buscarMejorCandidato devuelve solo coincidencias desde umbral medio', () => {
  const mejor = buscarMejorCandidato({ codigo: 'SJA', nombre: 'Soja primera' }, [
    candidato({ erpId: 'erp-bajo', codigo: 'MAIZ', nombre: 'Maiz temprano' }),
    candidato({ erpId: 'erp-medio', codigo: 'SOJA', nombre: 'Soja primera tardia' }),
  ]);

  assert.equal(mejor.candidato.erpId, 'erp-medio');
  assert.equal(mejor.puntaje, 60);
  assert.equal(mejor.motivo, 'coincidencia media por similitud');

  assert.equal(buscarMejorCandidato({ codigo: '', nombre: 'Cebada' }, [
    candidato({ codigo: 'MAIZ', nombre: 'Maiz temprano' }),
  ]), undefined);
});

test('buscarMejorCandidato desempata por nombre del candidato', () => {
  const mejor = buscarMejorCandidato({ codigo: '', nombre: 'Soja primera' }, [
    candidato({ erpId: 'erp-z', codigo: 'A', nombre: 'Soja primera Z' }),
    candidato({ erpId: 'erp-a', codigo: 'B', nombre: 'Soja primera A' }),
  ]);

  assert.equal(mejor.candidato.erpId, 'erp-a');
  assert.equal(mejor.puntaje, 60);
});

test('obtenerIdDesdeErpId extrae ids para zona y especie segun prefijo esperado', () => {
  assert.equal(obtenerIdDesdeErpId('empresa-1:zona:22', 'zona'), 22);
  assert.equal(obtenerIdDesdeErpId('global:especie:7', 'especie'), 7);
  assert.equal(obtenerIdDesdeErpId('global:zona:7', 'especie'), undefined);
  assert.equal(obtenerIdDesdeErpId(undefined, 'zona'), undefined);
});

test('zonaErpIdDesdeIdZona y especieErpIdDesdeIdEspecie generan claves ERP o undefined', () => {
  assert.equal(zonaErpIdDesdeIdZona(12), 'zona:12');
  assert.equal(zonaErpIdDesdeIdZona(null), undefined);
  assert.equal(especieErpIdDesdeIdEspecie(4), 'especie:4');
  assert.equal(especieErpIdDesdeIdEspecie(undefined), undefined);
});

test('toJsonValue remueve valores undefined y conserva datos serializables', () => {
  assert.deepEqual(toJsonValue({
    codigo: 'SOJA',
    omitido: undefined,
    nested: { nombre: 'Soja' },
  }), {
    codigo: 'SOJA',
    nested: { nombre: 'Soja' },
  });
});
