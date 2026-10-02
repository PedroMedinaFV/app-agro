const test = require('node:test');
const assert = require('node:assert/strict');
const { mapearPadronCampo, mapearRespuestaPadronesCampos } = require('../apps/api/dist/services/erp/mappers/padronesCampos');
const { mapearPadronLote } = require('../apps/api/dist/services/erp/mappers/padronesLotes');
const { mapearAgriculturaCultivo } = require('../apps/api/dist/services/erp/mappers/agriculturaCultivos');
const { mapearAgriculturaActividad } = require('../apps/api/dist/services/erp/mappers/agriculturaActividades');
const { mapearPadronInsumo } = require('../apps/api/dist/services/erp/mappers/padronesInsumos');
const { mapearPadronServicio } = require('../apps/api/dist/services/erp/mappers/padronesServicios');

test('mapearPadronCampo arma erpId por empresa y normaliza nombre y fecha nula', () => {
  const campo = mapearPadronCampo({
    idCampo: 241,
    idZona: 10,
    idSubZona: null,
    codigo: 'C-241',
    nombre: '  Campo Norte  ',
    activo: true,
    admiteGanaderia: false,
    domicilio: null,
    codigoSima: null,
    idLocalidad: null,
    fechaUltimaActualizacion: null,
  }, 'empresa:3');

  assert.equal(campo.empresaErpId, 'empresa:3');
  assert.equal(campo.erpId, 'empresa:3:campo:241');
  assert.equal(campo.nombre, 'Campo Norte');
  assert.equal(campo.actualizadoEn, new Date(0).toISOString());
});

test('mapearPadronLote vincula lote con campo ERP de la misma empresa', () => {
  const lote = mapearPadronLote({
    idLote: 55,
    idCampo: 241,
    codigo: 'L-55',
    nombre: '  Lote A  ',
    hectareas: 120,
    hectareasProductivas: 110,
    admiteGanaderia: true,
    admiteLecheria: false,
    codigoSima: null,
    activo: true,
    fechaUltimaActualizacion: '2026-09-01T10:00:00.000Z',
  }, 'empresa:3');

  assert.equal(lote.erpId, 'empresa:3:lote:55');
  assert.equal(lote.campoErpId, 'empresa:3:campo:241');
  assert.equal(lote.nombre, 'Lote A');
  assert.equal(lote.areaHectareas, 120);
  assert.equal(lote.hectareasProductivas, 110);
});

test('mapearAgriculturaCultivo conserva empresa y arma referencias operativas', () => {
  const cultivo = mapearAgriculturaCultivo({
    idCultivo: 900,
    codigo: 'CULT-900',
    nombre: '  Soja primera  ',
    idCampo: 241,
    idLote: 55,
    idActividad: 7,
    idEspecie: 2,
    idCampania: 26,
    hectareas: 100,
    hectareasSembradas: 95,
    hectareasCosechadas: 0,
    idPuerto: null,
    distanciaPuerto: null,
    idPersonalResponsable: null,
    esAgriculturaIntensiva: false,
    socioEnFuncionAportes: false,
    activo: true,
    fechaUltimaActualizacion: '2026-09-02T00:00:00.000Z',
  }, 'empresa:3');

  assert.equal(cultivo.erpId, 'empresa:3:cultivo:900');
  assert.equal(cultivo.campoErpId, 'empresa:3:campo:241');
  assert.equal(cultivo.loteErpId, 'empresa:3:lote:55');
  assert.equal(cultivo.actividadErpId, 'actividad:7');
  assert.equal(cultivo.especieErpId, 'especie:2');
  assert.equal(cultivo.campaniaErpId, 'campania:26');
});

test('mappers globales de actividad, insumo y servicio no duplican por empresa', () => {
  const actividad = mapearAgriculturaActividad({
    idActividad: 7,
    codigo: 'SOJ',
    descripcion: '  Soja  ',
    activo: true,
    habilitadoExportacionCrea: true,
    idEspecie: 2,
    idTipoActividad: null,
    fechaUltimaActualizacion: null,
  }, 'empresa:3');
  const insumo = mapearPadronInsumo({
    idInsumo: 12,
    idUnidadMedida: 1,
    idTipoInsumo: null,
    idCategoriaInsumo: null,
    codigo: 'HERB',
    nombre: '  Herbicida  ',
    activo: true,
    controlaStock: true,
    esInsumoGenerico: false,
    controlaPorLote: false,
    precioUnitario: 100,
    precioUnitarioVenta: null,
    unidadesBulto: null,
    idMonedaPrecioUnitario: 2,
    iMonedaPrecioVenta: null,
    idCuentaContable: null,
    idInsumoBanda: null,
    idInsumoEstandar: null,
    fechaUltimaActualizacion: null,
  }, 'empresa:3');
  const servicio = mapearPadronServicio({
    idServicio: 44,
    idTipoServicio: 8,
    codigo: '  PULV  ',
    descripcion: '  Pulverizacion  ',
    descripcionAbreviada: '  Pulv.  ',
    idUnidadMedida: 1,
    idMoneda: 2,
    precioUnitario: 15,
    idMonedaPersonal: null,
    importePersonal: null,
    activo: true,
    imputaDosis: true,
    fechaUltimaActualizacion: null,
  }, 'empresa:3');

  assert.equal(actividad.empresaErpId, 'global');
  assert.equal(actividad.erpId, 'actividad:7');
  assert.equal(actividad.descripcion, 'Soja');
  assert.equal(insumo.empresaErpId, 'global');
  assert.equal(insumo.erpId, 'insumo:12');
  assert.equal(insumo.nombre, 'Herbicida');
  assert.equal(insumo.idMonedaPrecioVenta, undefined);
  assert.equal(servicio.empresaErpId, 'global');
  assert.equal(servicio.erpId, 'servicio:44');
  assert.equal(servicio.codigo, 'PULV');
  assert.equal(servicio.descripcionAbreviada, 'Pulv.');
});

test('mapearRespuestaPadronesCampos falla con mensaje ERP cuando succeeded es false', () => {
  assert.throws(() => mapearRespuestaPadronesCampos({
    succeeded: false,
    message: 'Credenciales invalidas',
    errors: [],
    data: [],
  }, 'empresa:3'), /ERP Padrones\/Campos fallo: Credenciales invalidas/);
});
