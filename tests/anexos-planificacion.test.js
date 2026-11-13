const test = require('node:test');
const assert = require('node:assert/strict');
const { consolidarPlanificacion } = require('../packages/tipos/dist');
const { validarIntegridadCierre } = require('../apps/api/dist/services/planificacion/politicaDocumentosPlanificacion');

const linea = (cambios = {}) => ({ id: 'l1', planificacionId: 'base', campoAppId: 'campo', loteAppId: 'lote', actividadAppId: 'act', protocoloId: 'proto', hectareasPlanificadas: 10, ingresoNetoEstimado: 100, costoProduccionEstimado: 20, margenBrutoEstimado: 80, ...cambios });
const base = { id: 'base', clienteId: 'cliente', campaniaErpId: 'campania', tipoDocumento: 'base', estado: 'cerrada', escenarioOriginal: true, lineas: [linea()] };

test('anexos: cierre bloquea toda linea incompleta y lotes seleccionados sin linea, sin eliminar datos', () => {
  const plan = { ...base, lineas: [linea(), linea({ id: 'l2', actividadAppId: '', protocoloId: undefined })] };
  assert.throws(() => validarIntegridadCierre(plan), /campo campo, lote lote, linea l2/);
  assert.equal(plan.lineas.length, 2);
  assert.throws(() => validarIntegridadCierre({ ...base, alcanceLoteIds: ['lote', 'pendiente'] }), /pendiente sin lineas/);
  assert.doesNotThrow(() => validarIntegridadCierre(base));
});

test('anexos: consolidado excluye borradores y otros padres/clientes, conserva origen y pondera margen por ha', () => {
  const anexo = { ...base, id: 'anexo', tipoDocumento: 'anexo', planificacionOriginalId: 'base', lineas: [linea({ id: 'l2', planificacionId: 'anexo', loteAppId: 'nuevo', hectareasPlanificadas: 20, margenBrutoEstimado: 20 })] };
  const original = structuredClone(base);
  const resultado = consolidarPlanificacion(base, [anexo, { ...anexo, estado: 'borrador' }, { ...anexo, clienteId: 'ajeno' }, { ...anexo, planificacionOriginalId: 'otra' }]);
  assert.equal(resultado.anexos.length, 1);
  assert.equal(resultado.lineas[1].planificacionId, 'anexo');
  assert.equal(resultado.totales.margenPorHa, 100 / 30);
  assert.equal(resultado.totales.superficieFisica, 30);
  assert.deepEqual(base, original);
});

test('anexos: doble cultivo suma hectareas de cultivo pero cuenta una vez la superficie maxima del lote', () => {
  const resultado = consolidarPlanificacion({ ...base, lineas: [linea(), linea({ id: 'segunda', actividadAppId: 'segunda' })] }, []);
  assert.equal(resultado.totales.hectareasCultivo, 20);
  assert.equal(resultado.totales.superficieFisica, 10);
});
