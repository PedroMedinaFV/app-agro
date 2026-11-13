const test = require('node:test');
const assert = require('node:assert/strict');
const { crearProyectorDatosMaestros } = require('../apps/api/dist/services/planificacion/datosMaestrosPadronesErp');

async function proyector() {
  const delegado = (filas) => ({ findMany: async ({ where }) => {
    if ('clienteId' in where) assert.equal(where.clienteId, 'cliente-a');
    return filas;
  } });
  return crearProyectorDatosMaestros({
    zonaApp: delegado([{ id: 'zona-app', zonaErpId: 'zona:1' }]),
    campoApp: delegado([{ id: 'campo-app', campoErpId: 'campo:1' }]),
    especieApp: delegado([{ id: 'especie-app', especieErpId: 'especie:1' }]),
    erpUnidadMedida: delegado([{ idUnidadMedida: 1, codigo: 'KG' }]),
    erpTipoInsumo: delegado([{ idTipoInsumo: 1, descripcion: 'Semilla' }]),
  }, 'cliente-a');
}

test('maestros ERP: relaciones App se resuelven por identidad del mismo cliente, nunca por nombre', async () => {
  const p = await proyector();
  assert.deepEqual(p.campos({ nombre: 'Campo real', codigo: '00001', empresaErpId: 'empresa', idZona: 1 }), {
    nombre: 'Campo real', codigoInterno: '00001', empresaErpId: 'empresa', zonaErpId: 'zona:1', zonaAppId: 'zona-app',
  });
  assert.equal(p.actividades({ descripcion: 'Actividad real', codigo: 'AC', idEspecie: 1 }).especieAppId, 'especie-app');
  assert.throws(() => p.campos({ nombre: 'Campo', codigo: '1', idZona: 2 }), { statusCode: 409 });
  assert.throws(() => p.actividades({ descripcion: 'Actividad', codigo: '1', idEspecie: 2 }), { statusCode: 409 });
  assert.equal(p.campos({ nombre: 'Campo', codigo: '', idZona: null }).zonaAppId, null);
  assert.equal('especieAppId' in p.actividades({ descripcion: 'Actividad sin especie ERP', codigo: '', idEspecie: null }), false);
});

test('maestros ERP: lotes toman superficies reales y rechazan datos inconsistentes o padre ausente', async () => {
  const p = await proyector();
  const fuente = { nombre: 'Lote', codigo: 'L', campoErpId: 'campo:1', areaHectareas: 10, hectareasProductivas: 0 };
  assert.equal(p.lotes(fuente).superficieProductiva, 0);
  assert.equal(p.lotes({ ...fuente, hectareasProductivas: null }).superficieProductiva, 10);
  assert.throws(() => p.lotes({ ...fuente, hectareasProductivas: 11 }), { statusCode: 409 });
  assert.throws(() => p.lotes({ ...fuente, areaHectareas: NaN }), { statusCode: 409 });
  assert.throws(() => p.lotes({ ...fuente, campoErpId: 'campo:otro-cliente' }), { statusCode: 409 });
});

test('maestros ERP: insumos y labores actualizan datos tecnicos sin incluir importes o moneda propios', async () => {
  const p = await proyector();
  const insumo = p.insumos({ nombre: 'Semilla ERP', codigo: '00009', idTipoInsumo: 1, idUnidadMedida: 1, precioUnitario: 999 });
  assert.equal(insumo.tipo, 'Semilla');
  assert.equal(insumo.unidad, 'KG');
  assert.equal('precioUnitarioEstimado' in insumo, false);
  assert.equal('moneda' in insumo, false);
  const labor = p.labores({ descripcion: 'Labor ERP', codigo: '00010', idServicio: 4, idTipoServicio: null, descripcionAbreviada: null, idUnidadMedida: 1, idMoneda: 8, precioUnitario: 999, imputaDosis: false, activo: false, actualizadoEn: new Date() });
  assert.equal(labor.imputaDosis, false);
  assert.equal(labor.activo, false);
  assert.equal('idMoneda' in labor, false);
  assert.equal('costoUnitarioSugerido' in labor, false);
  assert.throws(() => p.insumos({ nombre: 'Insumo', codigo: '', idTipoInsumo: null, idUnidadMedida: 99 }), { statusCode: 409 });
});
