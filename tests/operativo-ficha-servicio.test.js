const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapearCampoOperativo,
  mapearCultivoOperativo,
  mapearGeografiaOperativa,
  mapearLineaPlanificacionOperativa,
  mapearLoteOperativo,
  mapearZonaOperativa,
  validarAlcanceCampoOperativo,
} = require('../apps/api/dist/services/operativo/fichasLotesPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearLoteFichaRow(overrides = {}) {
  return {
    loteId: 'lote-1',
    loteClienteId: 'cliente-1',
    loteCampoAppId: 'campo-1',
    loteErpId: 'empresa:1:lote:1',
    loteNombre: 'Lote Norte',
    loteCodigoInterno: 'LN-01',
    loteSuperficieTotal: 150,
    loteSuperficieProductiva: 140,
    loteEstadoVinculacion: 'vinculado_erp',
    loteCreatedAt: fechaBase,
    loteUpdatedAt: fechaBase,
    campoId: 'campo-1',
    campoClienteId: 'cliente-1',
    campoEmpresaErpId: 'empresa:1',
    campoErpId: 'empresa:1:campo:1',
    campoNombre: 'Campo Norte',
    campoCodigoInterno: 'CN-01',
    campoZonaAppId: 'zona-1',
    campoZonaErpId: 'empresa:1:zona:1',
    campoEstadoVinculacion: 'vinculado_erp',
    campoCreatedAt: fechaBase,
    campoUpdatedAt: fechaBase,
    zonaId: 'zona-1',
    zonaClienteId: 'cliente-1',
    zonaEmpresaErpId: 'empresa:1',
    zonaErpId: 'empresa:1:zona:1',
    zonaNombre: 'Zona Delta',
    zonaCodigoInterno: 'ZD',
    zonaEstadoVinculacion: 'vinculado_erp',
    zonaCreatedAt: fechaBase,
    zonaUpdatedAt: fechaBase,
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

test('mappers de campo, lote y zona operativa serializan ficha base', () => {
  const row = crearLoteFichaRow();
  const campo = mapearCampoOperativo(row);
  const lote = mapearLoteOperativo(row);
  const zona = mapearZonaOperativa(row);

  assert.equal(campo.id, 'campo-1');
  assert.equal(campo.campoErpId, 'empresa:1:campo:1');
  assert.equal(campo.zonaAppId, 'zona-1');
  assert.equal(campo.createdAt, fechaBase.toISOString());
  assert.equal(lote.id, 'lote-1');
  assert.equal(lote.loteErpId, 'empresa:1:lote:1');
  assert.equal(lote.superficieTotal, 150);
  assert.equal(lote.superficieProductiva, 140);
  assert.equal(zona.id, 'zona-1');
  assert.equal(zona.zonaErpId, 'empresa:1:zona:1');
});

test('mappers de campo, lote y zona operativa omiten opcionales nulos', () => {
  const row = crearLoteFichaRow({
    loteErpId: null,
    loteCodigoInterno: null,
    campoErpId: null,
    campoCodigoInterno: null,
    campoZonaAppId: null,
    campoZonaErpId: null,
    zonaId: null,
    zonaClienteId: null,
    zonaEmpresaErpId: null,
    zonaErpId: null,
    zonaNombre: null,
    zonaCodigoInterno: null,
    zonaEstadoVinculacion: null,
    zonaCreatedAt: null,
    zonaUpdatedAt: null,
  });

  assert.equal(mapearCampoOperativo(row).campoErpId, undefined);
  assert.equal(mapearCampoOperativo(row).codigoInterno, undefined);
  assert.equal(mapearCampoOperativo(row).zonaAppId, undefined);
  assert.equal(mapearLoteOperativo(row).loteErpId, undefined);
  assert.equal(mapearLoteOperativo(row).codigoInterno, undefined);
  assert.equal(mapearZonaOperativa(row), undefined);
});

test('mapearCultivoOperativo serializa cultivo y opcionales', () => {
  const cultivo = mapearCultivoOperativo({
    id: 'cultivo-1',
    erpId: 'empresa:1:cultivo:1',
    nombre: 'Soja primera',
    campaniaNombre: '2026/27',
    actividadNombre: 'Soja',
    hectareas: 100,
    hectareasSembradas: 90,
    hectareasCosechadas: 10,
    activo: true,
    actualizadoEn: fechaBase,
  });

  assert.equal(cultivo.erpId, 'empresa:1:cultivo:1');
  assert.equal(cultivo.campaniaNombre, '2026/27');
  assert.equal(cultivo.actividadNombre, 'Soja');
  assert.equal(cultivo.actualizadoEn, fechaBase.toISOString());

  const sinOpcionales = mapearCultivoOperativo({ ...cultivo, campaniaNombre: null, actividadNombre: null, actualizadoEn: fechaBase });
  assert.equal(sinOpcionales.campaniaNombre, undefined);
  assert.equal(sinOpcionales.actividadNombre, undefined);
});

test('mapearLineaPlanificacionOperativa serializa planificacion relacionada', () => {
  const linea = mapearLineaPlanificacionOperativa({
    id: 'linea-1',
    planificacionId: 'plan-1',
    planificacionNombre: 'Plan gruesa',
    estadoPlanificacion: 'borrador',
    actividadNombre: 'Maiz',
    protocoloNombre: 'Alta tecnologia',
    destinoVenta: 'Puerto',
    hectareasPlanificadas: 85,
    rindeEstimado: 95,
    margenBrutoEstimado: 35000,
  });

  assert.equal(linea.planificacionNombre, 'Plan gruesa');
  assert.equal(linea.actividadNombre, 'Maiz');
  assert.equal(linea.protocoloNombre, 'Alta tecnologia');
  assert.equal(linea.margenBrutoEstimado, 35000);

  const sinOpcionales = mapearLineaPlanificacionOperativa({ ...linea, actividadNombre: null, protocoloNombre: null });
  assert.equal(sinOpcionales.actividadNombre, undefined);
  assert.equal(sinOpcionales.protocoloNombre, undefined);
});

test('mapearGeografiaOperativa serializa archivo geografico principal', () => {
  const geografia = mapearGeografiaOperativa({
    id: 'archivo-1',
    nombreArchivo: 'lote.kml',
    tipo: 'kml',
    estado: 'procesado',
    esPrincipal: true,
    geometriaGeoJson: { type: 'Polygon', coordinates: [] },
    superficieCalculadaHa: 139.5,
    observaciones: 'Perimetro cargado',
    updatedAt: fechaBase,
  });

  assert.equal(geografia.archivoId, 'archivo-1');
  assert.equal(geografia.tipo, 'kml');
  assert.equal(geografia.estado, 'procesado');
  assert.equal(geografia.esPrincipal, true);
  assert.equal(geografia.superficieCalculadaHa, 139.5);
  assert.deepEqual(geografia.geometriaGeoJson, { type: 'Polygon', coordinates: [] });
  assert.equal(geografia.actualizadoEn, fechaBase.toISOString());
  assert.equal(mapearGeografiaOperativa(undefined), undefined);
});

test('validarAlcanceCampoOperativo permite admin sin consultar asignaciones', async () => {
  const llamadas = [];

  await validarAlcanceCampoOperativo(
    { id: 'admin-1', rol: 'admin', clienteId: 'cliente-1' },
    null,
    crearDeps(['empresa:1:campo:1'], llamadas),
  );

  assert.deepEqual(llamadas, []);
});

test('validarAlcanceCampoOperativo permite acceso global cuando asignaciones es null', async () => {
  const llamadas = [];

  await validarAlcanceCampoOperativo(
    { id: 'planificador-1', rol: 'planificador', clienteId: 'cliente-1' },
    null,
    crearDeps(null, llamadas),
  );

  assert.deepEqual(llamadas, [{
    sub: 'planificador-1',
    rol: 'planificador',
    clienteId: 'cliente-1',
  }]);
});

test('validarAlcanceCampoOperativo permite campo asignado y bloquea no asignado', async () => {
  await validarAlcanceCampoOperativo(
    { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
    'empresa:1:campo:1',
    crearDeps(['empresa:1:campo:1']),
  );

  const error = await capturarErrorAsync(
    () => validarAlcanceCampoOperativo(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      'empresa:1:campo:2',
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});

test('validarAlcanceCampoOperativo bloquea lotes sin campoErpId para operadores restringidos', async () => {
  const error = await capturarErrorAsync(
    () => validarAlcanceCampoOperativo(
      { id: 'operador-1', rol: 'operador_campo', clienteId: 'cliente-1' },
      null,
      crearDeps(['empresa:1:campo:1']),
    ),
  );

  assert.match(error.message, /No tienes permisos/);
  assert.equal(error.statusCode, 403);
});
