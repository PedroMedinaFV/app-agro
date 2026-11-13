const test = require('node:test');
const assert = require('node:assert/strict');
const { idCopiaPadronErp } = require('../../packages/tipos/dist');

module.exports = function registrarPruebasMaestros({ prisma, request, clientes, usuarios, campos }) {
  const fecha = new Date('2026-11-13T12:00:00Z');
  const configuraciones = {
    campos: ['campoApp', 'erpCampo', 'campo', 'campoErpId', 'campo-app', 'campos-app'],
    lotes: ['loteApp', 'erpLote', 'lote', 'loteErpId', 'lote-app', 'lotes-app'],
    especies: ['especieApp', 'erpEspecie', 'especie', 'especieErpId', 'especie-app', 'especies-app'],
    actividades: ['actividadApp', 'erpActividad', 'actividad', 'actividadErpId', 'actividad-app', 'actividades-app'],
    insumos: ['insumoApp', 'erpInsumo', 'insumo', 'insumoErpId', 'insumo-app', 'insumos-app'],
    labores: ['servicioApp', 'erpServicio', 'servicio', 'servicioErpId', 'servicio-app', 'servicios-app'],
  };

  async function prepararCatalogos() {
    await prisma.erpZona.upsert({ where: { erpId: 'zona:98800' }, update: {}, create: { erpId: 'zona:98800', empresaErpId: 'global', idZona: 98800, codigo: '98800', nombre: 'ZONA MAESTROS' } });
    await prisma.zonaApp.upsert({ where: { id: 'zona-maestros-padre' }, update: {}, create: { id: 'zona-maestros-padre', clienteId: clientes.a, empresaErpId: 'global', zonaErpId: 'zona:98800', nombre: 'ZONA MAESTROS', estadoVinculacion: 'vinculado_erp' } });
    await prisma.erpEspecie.upsert({ where: { erpId: 'especie:98800' }, update: {}, create: { erpId: 'especie:98800', empresaErpId: 'global', idEspecie: 98800, codigo: '98800', nombre: 'ESPECIE MAESTROS', activo: true, actualizadoEn: fecha } });
    await prisma.especieApp.upsert({ where: { id: 'especie-maestros-padre' }, update: {}, create: { id: 'especie-maestros-padre', clienteId: clientes.a, empresaErpId: 'global', especieErpId: 'especie:98800', nombre: 'ESPECIE MAESTROS', estadoVinculacion: 'vinculado_erp' } });
    await prisma.erpUnidadMedida.upsert({ where: { erpId: 'unidad:98800' }, update: {}, create: { erpId: 'unidad:98800', empresaErpId: 'global', idUnidadMedida: 98800, codigo: 'KG', descripcion: 'Kilogramos', activo: true, actualizadoEn: fecha } });
    await prisma.erpTipoInsumo.upsert({ where: { erpId: 'tipo:98800' }, update: {}, create: { erpId: 'tipo:98800', empresaErpId: 'global', idTipoInsumo: 98800, codigo: '98800', descripcion: 'TIPO REAL', activo: true, usaPadronEstandar: false, actualizadoEn: fecha } });
    await prisma.erpMoneda.upsert({ where: { erpId: 'moneda-maestros-usd' }, update: {}, create: { erpId: 'moneda-maestros-usd', empresaErpId: 'global', idMoneda: 98801, codigo: 'USD', nombre: 'Dolares', activo: true, actualizadoEn: fecha } });
    await prisma.erpMoneda.upsert({ where: { erpId: 'moneda-maestros-eur' }, update: {}, create: { erpId: 'moneda-maestros-eur', empresaErpId: 'global', idMoneda: 98802, codigo: 'EUR', nombre: 'Euros', activo: true, actualizadoEn: fecha } });
  }

  async function escenario(tipo, numero, clienteId = clientes.a) {
    const [modelo, cache, singular, referencia, prefijo, ruta] = configuraciones[tipo];
    const erpId = `${singular}:${numero}`;
    const nombre = `REAL ${tipo} ${numero}`;
    const codigo = `00${numero}`;
    const global = { empresaErpId: 'global', erpId, codigo, activo: true, actualizadoEn: fecha };
    const fuente = {
      campos: { ...global, empresaErpId: campos.a.empresaErpId, idCampo: numero, idZona: 98800, nombre },
      lotes: { ...global, empresaErpId: campos.a.empresaErpId, idLote: numero, idCampo: 1, campoErpId: campos.a.campoErpId, nombre, areaHectareas: 50, hectareasProductivas: 40 },
      especies: { ...global, idEspecie: numero, nombre },
      actividades: { ...global, idActividad: numero, descripcion: nombre, idEspecie: 98800, habilitadoExportacionCrea: false },
      insumos: { ...global, idInsumo: numero, nombre, idTipoInsumo: 98800, idUnidadMedida: 98800, precioUnitario: 999, idMonedaPrecioUnitario: 98802, controlaStock: false, esInsumoGenerico: false, controlaPorLote: false },
      labores: { ...global, idServicio: numero, descripcion: nombre, descripcionAbreviada: `ABR ${numero}`, idUnidadMedida: 98800, idMoneda: 98802, precioUnitario: 999, imputaDosis: false },
    }[tipo];
    await prisma[cache].create({ data: fuente });
    const id = `maestros-${tipo}-${numero}`;
    const propio = {
      id, clienteId, empresaErpId: 'global', nombre: `Provisorio ${tipo} ${numero}`, codigoInterno: `PROV-${numero}`,
      ...({
        campos: { empresaErpId: campos.a.empresaErpId, zonaAppId: 'zona-maestros-padre', zonaErpId: 'zona:98800' },
        lotes: { campoAppId: campos.a.id, superficieTotal: 20, superficieProductiva: 15 },
        actividades: { especieAppId: 'especie-maestros-padre', especieErpId: 'especie:98800', tipoGrano: 'fina', tipoCultivo: 'segunda', epocaSiembra: 'invierno' },
        insumos: { idTipoInsumo: null, tipo: 'TIPO PROVISORIO', unidad: 'L', precioUnitarioEstimado: 12.75, moneda: 'USD' },
        labores: { codigo: `PROV-${numero}`, unidadSugerida: 'L', costoUnitarioSugerido: 23.5, idMoneda: 98801, activo: true, origen: 'provisorio' },
      }[tipo] || {}),
    };
    if (tipo === 'lotes') delete propio.empresaErpId;
    if (tipo === 'labores') delete propio.codigoInterno;
    await prisma[modelo].create({ data: { ...propio, createdBy: usuarios.adminA.id } });
    return { tipo, modelo, cache, singular, referencia, prefijo, ruta, erpId, nombre, codigo, propio, fuente };
  }

  function verificar(caso, registro) {
    assert.equal(registro.id, caso.propio.id);
    assert.equal(registro[caso.referencia], caso.erpId);
    assert.equal(registro.nombre, caso.nombre);
    assert.equal(registro[caso.tipo === 'labores' ? 'codigo' : 'codigoInterno'], caso.codigo);
    if (caso.tipo === 'campos') assert.equal(registro.zonaAppId, 'zona-maestros-padre');
    if (caso.tipo === 'lotes') { assert.equal(registro.campoAppId, campos.a.id); assert.equal(registro.superficieTotal, 50); assert.equal(registro.superficieProductiva, 40); }
    if (caso.tipo === 'actividades') { assert.equal(registro.especieAppId, 'especie-maestros-padre'); assert.equal(registro.tipoGrano, 'fina'); assert.equal(registro.tipoCultivo, 'segunda'); assert.equal(registro.epocaSiembra, 'invierno'); }
    if (caso.tipo === 'insumos') { assert.equal(registro.idTipoInsumo, 98800); assert.equal(registro.tipo, 'TIPO REAL'); assert.equal(registro.unidad, 'KG'); assert.equal(registro.precioUnitarioEstimado, 12.75); assert.equal(registro.moneda, 'USD'); }
    if (caso.tipo === 'labores') { assert.equal(registro.unidadSugerida, 'KG'); assert.equal(registro.idServicio, caso.fuente.idServicio); assert.equal(registro.costoUnitarioSugerido, 23.5); assert.equal(registro.idMoneda, 98801); assert.equal(registro.imputaDosis, false); }
  }

  test('maestros ERP: los seis padrones adoptan datos reales por HTTP y Notificaciones sin perder atributos App', async () => {
    await prepararCatalogos();
    let numero = 98810;
    for (const tipo of Object.keys(configuraciones)) {
      for (const via of ['padron', 'notificacion']) {
        const caso = await escenario(tipo, numero++);
        const anteriorId = idCopiaPadronErp(caso.prefijo, caso.erpId, clientes.a);
        await prisma[caso.modelo].create({ data: { ...caso.propio, id: anteriorId, [caso.referencia]: caso.erpId, estadoVinculacion: 'vinculado_erp', ...(tipo === 'labores' ? { codigo: `COPIA-${numero}` } : {}) } });
        let respuesta;
        if (via === 'padron') {
          const datosEconomicosErp = tipo === 'insumos' ? { precioUnitarioEstimado: 999, moneda: 'EUR' } : tipo === 'labores' ? { costoUnitarioSugerido: 999, idMoneda: 98802 } : {};
          respuesta = await request(`/${caso.ruta}/${caso.propio.id}`, { usuario: 'adminA', method: 'PUT', body: { [caso.singular]: { ...caso.propio, ...datosEconomicosErp, [caso.referencia]: caso.erpId }, origen: 'web' }, timeout: 90000 });
          assert.equal(respuesta.status, 200, `${tipo}: ${JSON.stringify(respuesta.body)}`);
          verificar(caso, respuesta.body[caso.singular]);
        } else {
          const sugerencia = await prisma.vinculacionErpSugerida.create({ data: { clienteId: clientes.a, empresaErpId: caso.fuente.empresaErpId, entidadTipo: tipo, entidadPlanificacionId: caso.propio.id, entidadErpId: caso.erpId, entidadErpSnapshot: {}, puntajeCoincidencia: 1, criterioCoincidencia: {} } });
          const notificacion = await prisma.notificacionUsuario.create({ data: { clienteId: clientes.a, tipo: 'vinculacion_erp_sugerida', titulo: 'Prueba', mensaje: 'Prueba', vinculacionSugeridaId: sugerencia.id } });
          respuesta = await request(`/notificaciones/${notificacion.id}/resolver-vinculacion`, { usuario: 'adminA', body: { decision: 'aceptar' }, timeout: 90000 });
          assert.equal(respuesta.status, 200, `${tipo}: ${JSON.stringify(respuesta.body)}`);
          assert.equal((await prisma.notificacionUsuario.findUnique({ where: { id: notificacion.id } })).estado, 'resuelta');
        }
        verificar(caso, await prisma[caso.modelo].findUnique({ where: { id: caso.propio.id } }));
        assert.equal(await prisma[caso.modelo].count({ where: { clienteId: clientes.a, [caso.referencia]: caso.erpId } }), 1);
        assert.equal((await prisma.aliasPadronApp.findUnique({ where: { clienteId_tipo_anteriorId: { clienteId: clientes.a, tipo, anteriorId } } })).actualId, caso.propio.id);
      }
    }
  });

  test('maestros ERP: sincronizacion de seis padrones corrige vinculos previos y preserva datos propios, provisorios y otro cliente', async () => {
    const { asegurarPadronesPlanificacionDesdeErp } = require('../../apps/api/dist/services/planificacion/padronesPlanificacionPrisma');
    await prepararCatalogos();
    const casos = [];
    let numero = 98840;
    for (const tipo of Object.keys(configuraciones)) {
      const caso = await escenario(tipo, numero++);
      await prisma[caso.modelo].update({ where: { id: caso.propio.id }, data: { [caso.referencia]: caso.erpId, estadoVinculacion: 'vinculado_erp' } });
      const otro = { ...caso.propio, id: `${caso.propio.id}-otro`, clienteId: clientes.b, [caso.referencia]: caso.erpId, estadoVinculacion: 'vinculado_erp' };
      // No fabricar relaciones entre clientes en los fixtures.
      if (tipo === 'campos') { otro.zonaAppId = null; otro.zonaErpId = null; }
      if (tipo === 'lotes') otro.campoAppId = campos.b.id;
      if (tipo === 'actividades') otro.especieAppId = null;
      await prisma[caso.modelo].create({ data: otro });
      const provisorio = { ...caso.propio, id: `${caso.propio.id}-sin-vinculo`, ...(tipo === 'labores' ? { codigo: `SIN-${numero}` } : {}) };
      await prisma[caso.modelo].create({ data: provisorio });
      casos.push(caso);
    }
    await asegurarPadronesPlanificacionDesdeErp(clientes.a, null);
    for (const caso of casos) {
      const registro = await prisma[caso.modelo].findUnique({ where: { id: caso.propio.id } });
      verificar(caso, registro);
      assert.equal(registro.createdBy, usuarios.adminA.id);
      assert.equal((await prisma[caso.modelo].findUnique({ where: { id: `${caso.propio.id}-otro` } })).nombre, caso.propio.nombre);
      assert.equal((await prisma[caso.modelo].findUnique({ where: { id: `${caso.propio.id}-sin-vinculo` } })).nombre, caso.propio.nombre);
    }
    const contar = () => prisma.auditoriaEvento.count({ where: { entidadId: { in: casos.map((c) => c.propio.id) }, accion: 'sincronizar_datos_erp' } });
    assert.equal(await contar(), 6);
    await asegurarPadronesPlanificacionDesdeErp(clientes.a, null);
    assert.equal(await contar(), 6, 'sin diferencias no se repiten escrituras/auditorias');
  });
};
