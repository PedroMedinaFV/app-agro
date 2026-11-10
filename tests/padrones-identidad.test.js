const test = require('node:test');
const assert = require('node:assert/strict');
const { preferirRegistrosApp, idsErpOcupados, esCopiaAutomaticaErp, idCopiaPadronErp, actualizarRegistroPadron } = require('../packages/tipos/dist');

test('padrones: copia App prevalece sobre ERP por identidad y conserva nombres editados, no fusiona homonimos', () => {
  const propios = [{ id: 'propia', especieErpId: 'especie:1', nombre: 'Nombre editado' }, { id: 'provisoria', nombre: 'ALFALFA' }];
  const erp = [{ erpId: 'especie:1', nombre: 'ALFALFA' }, { erpId: 'especie:2', nombre: 'ALFALFA' }];
  const opciones = preferirRegistrosApp(propios, erp, (item) => item.especieErpId, (item) => item.erpId);
  assert.equal(opciones.propios[0].nombre, 'Nombre editado');
  assert.deepEqual(opciones.erp.map((item) => item.erpId), ['especie:2']);
  assert.equal(opciones.propios.length, 2);
});

test('padrones: IDs materializados incluyen cliente y no colisionan al normalizar separadores', () => {
  assert.notEqual(idCopiaPadronErp('zona-app', 'b-c', 'a'), idCopiaPadronErp('zona-app', 'c', 'a-b'));
  assert.notEqual(idCopiaPadronErp('zona-app', 'zona:1', 'a'), idCopiaPadronErp('zona-app', 'zona-1', 'a'));
  assert.notEqual(idCopiaPadronErp('zona-app', 'zona:1', 'a'), idCopiaPadronErp('zona-app', 'zona:1', 'b'));
});

test('padrones: reconoce copias antiguas y nuevas pero una edicion o un alta manual ocupa el vinculo', () => {
  const base = { clienteId: 'a', zonaErpId: 'zona:39', createdBy: null, updatedBy: null };
  assert.equal(esCopiaAutomaticaErp('zonas', { ...base, id: 'zona-app-zona-39' }), true);
  assert.equal(esCopiaAutomaticaErp('zonas', { ...base, id: idCopiaPadronErp('zona-app', 'zona:39', 'a') }), true);
  assert.equal(esCopiaAutomaticaErp('zonas', { ...base, id: `${idCopiaPadronErp('zona-app', 'zona:39', 'a')}:c920a4d8-1a2b-4c8d-9e11-87fd283f3312` }), true);
  assert.equal(esCopiaAutomaticaErp('zonas', { ...base, id: 'zona-app-zona-39', updatedBy: 'usuario' }), false);
  assert.equal(esCopiaAutomaticaErp('zonas', { ...base, id: 'manual' }), false);
  const ocupados = idsErpOcupados([{ zonaErpId: 'zona:39', vinculoAutomatico: true }, { zonaErpId: 'zona:40', vinculoAutomatico: false }], (item) => item.zonaErpId);
  assert.deepEqual([...ocupados], ['zona:40']);
});

test('padrones: estado visible elimina la copia absorbida al recibir confirmacion del servidor', () => {
  const guardado = { id: 'manual', zonaErpId: 'zona:39' };
  const actual = [{ id: 'copia', zonaErpId: 'zona:39' }, { id: 'manual' }, { id: 'otra', zonaErpId: 'zona:40' }];
  assert.deepEqual(actualizarRegistroPadron(actual, guardado, (item) => item.zonaErpId).map((item) => item.id), ['manual', 'otra']);
});
