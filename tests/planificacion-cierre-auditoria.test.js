const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cerrarPlanificacionEnTransaccion,
} = require('../apps/api/dist/services/planificacion/planificacionesPrisma');

const fechaBase = new Date('2026-10-01T12:00:00.000Z');

function crearLinea(overrides = {}) {
  return {
    id: 'linea-1',
    planificacionId: 'plan-1',
    empresaErpId: 'empresa-1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:1',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:1',
    actividadAppId: 'actividad-1',
    actividadErpId: 'actividad:1',
    cultivoErpId: 'empresa:1:cultivo:1',
    destinoReferenciaId: 'destino-1',
    destinoVenta: 'Puerto Norte',
    destinoVentaManual: false,
    precioReferenciaId: 'precio-1',
    precioVentaEstimado: 200,
    precioVentaManual: false,
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    gastosComercialesReferenciaId: 'gasto-1',
    gastosComercialesEstimados: 600,
    protocoloId: 'protocolo-1',
    ingresoBrutoEstimado: 1,
    ingresoNetoEstimado: 1,
    costoProduccionEstimado: 1500,
    margenBrutoEstimado: 1,
    margenBrutoActualizado: null,
    estado: 'aprobada',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    ...overrides,
  };
}

function crearPlanificacion(overrides = {}) {
  return {
    id: 'plan-1',
    clienteId: 'cliente-1',
    campaniaErpId: 'campania-26',
    nombre: 'Plan campania 26',
    descripcion: null,
    estado: 'aprobada',
    escenarioOriginal: false,
    escenarioBloqueadoPorId: null,
    cerradaPor: null,
    cerradaAt: null,
    motivoCierre: null,
    createdAt: fechaBase,
    updatedAt: fechaBase,
    lineas: [crearLinea()],
    ...overrides,
  };
}

function crearTx({ existente = crearPlanificacion(), alternativos = [] } = {}) {
  const auditorias = [];
  const lineasActualizadas = [];
  const planificacionesActualizadas = [];
  const updateManyCalls = [];

  const tx = {
    loteApp: {
      findMany: async () => existente.lineas.map((linea) => ({
        id: linea.loteAppId,
        nombre: `Lote ${linea.loteAppId}`,
        superficieTotal: 100,
      })),
    },
    planificacionAgricolaLinea: {
      update: async (args) => {
        lineasActualizadas.push(args);
        return args.data;
      },
    },
    planificacionAgricola: {
      findUnique: async () => existente,
      findMany: async () => alternativos,
      updateMany: async (args) => {
        updateManyCalls.push(args);
        return { count: alternativos.length };
      },
      update: async (args) => {
        planificacionesActualizadas.push(args);
        const lineasCerradas = existente.lineas.map((linea) => ({
          ...linea,
          ingresoBrutoEstimado: linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado,
          ingresoNetoEstimado: (linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado) - linea.gastosComercialesEstimados,
          margenBrutoEstimado: ((linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado) - linea.gastosComercialesEstimados) - linea.costoProduccionEstimado,
          margenBrutoActualizado: ((linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado) - linea.gastosComercialesEstimados) - linea.costoProduccionEstimado,
          estado: 'cerrada',
          updatedAt: fechaBase,
        }));

        return {
          ...existente,
          ...args.data,
          cerradaAt: fechaBase,
          lineas: lineasCerradas,
          updatedAt: fechaBase,
        };
      },
    },
    auditoriaEvento: {
      create: async (args) => {
        auditorias.push(args.data);
        return args.data;
      },
    },
  };

  return {
    tx,
    auditorias,
    lineasActualizadas,
    planificacionesActualizadas,
    updateManyCalls,
  };
}

test('cerrarPlanificacionEnTransaccion congela lineas y audita el cierre con antes y despues', async () => {
  const { tx, auditorias, lineasActualizadas, planificacionesActualizadas } = crearTx();

  const respuesta = await cerrarPlanificacionEnTransaccion(tx, 'plan-1', {
    origen: 'web',
    motivo: 'Escenario aprobado por direccion',
  }, {
    id: 'usuario-1',
    clienteId: 'cliente-1',
    email: 'admin@agro.test',
  });

  assert.equal(respuesta.auditado, true);
  assert.equal(respuesta.planificacion.estado, 'cerrada');
  assert.equal(respuesta.planificacion.escenarioOriginal, true);
  assert.equal(respuesta.planificacion.lineas[0].estado, 'cerrada');
  assert.equal(respuesta.planificacion.lineas[0].ingresoBrutoEstimado, 6000);
  assert.equal(respuesta.planificacion.lineas[0].ingresoNetoEstimado, 5400);
  assert.equal(respuesta.planificacion.lineas[0].margenBrutoEstimado, 3900);

  assert.equal(lineasActualizadas.length, 1);
  assert.equal(lineasActualizadas[0].where.id, 'linea-1');
  assert.equal(lineasActualizadas[0].data.estado, 'cerrada');
  assert.equal(lineasActualizadas[0].data.ingresoBrutoEstimado, 6000);
  assert.equal(lineasActualizadas[0].data.ingresoNetoEstimado, 5400);
  assert.equal(lineasActualizadas[0].data.margenBrutoEstimado, 3900);
  assert.equal(lineasActualizadas[0].data.margenBrutoActualizado, 3900);

  assert.equal(planificacionesActualizadas.length, 1);
  assert.equal(planificacionesActualizadas[0].data.estado, 'cerrada');
  assert.equal(planificacionesActualizadas[0].data.escenarioOriginal, true);
  assert.equal(planificacionesActualizadas[0].data.cerradaPor, 'usuario-1');
  assert.equal(planificacionesActualizadas[0].data.motivoCierre, 'Escenario aprobado por direccion');

  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, 'cerrar');
  assert.equal(auditorias[0].usuarioId, 'usuario-1');
  assert.equal(auditorias[0].origen, 'web');
  assert.equal(auditorias[0].motivo, 'Escenario aprobado por direccion');
  assert.equal(auditorias[0].valoresAntes.estado, 'aprobada');
  assert.equal(auditorias[0].valoresDespues.estado, 'cerrada');
  assert.equal(auditorias[0].valoresDespues.lineas[0].estado, 'cerrada');
});

test('cerrarPlanificacionEnTransaccion audita escenarios alternativos deshabilitados', async () => {
  const alternativo = crearPlanificacion({
    id: 'plan-alt',
    nombre: 'Plan alternativo',
    lineas: [crearLinea({ id: 'linea-alt', planificacionId: 'plan-alt', loteAppId: 'lote-2', actividadAppId: 'actividad-2' })],
  });
  const { tx, auditorias, updateManyCalls } = crearTx({ alternativos: [alternativo] });

  const respuesta = await cerrarPlanificacionEnTransaccion(tx, 'plan-1', {
    origen: 'api',
    motivo: 'Cierre final',
  }, { id: 'usuario-2' });

  assert.match(respuesta.mensaje, /Se deshabilitaron 1 escenario/);
  assert.equal(updateManyCalls.length, 1);
  assert.equal(updateManyCalls[0].data.estado, 'deshabilitada');
  assert.equal(updateManyCalls[0].data.escenarioBloqueadoPorId, 'plan-1');

  assert.deepEqual(auditorias.map((evento) => evento.accion), [
    'cerrar',
    'deshabilitar_escenarios_alternativos',
  ]);
  assert.equal(auditorias[1].valoresAntes[0].id, 'plan-alt');
  assert.deepEqual(auditorias[1].valoresDespues, {
    escenarioOriginalId: 'plan-1',
    escenariosDeshabilitados: ['plan-alt'],
  });
});

test('cerrarPlanificacionEnTransaccion rechaza planificacion ya cerrada sin auditar cambios', async () => {
  const { tx, auditorias, lineasActualizadas } = crearTx({
    existente: crearPlanificacion({ estado: 'cerrada', escenarioOriginal: true }),
  });

  await assert.rejects(
    () => cerrarPlanificacionEnTransaccion(tx, 'plan-1', { origen: 'web' }, { id: 'usuario-1' }),
    /ya esta cerrada/,
  );

  assert.equal(auditorias.length, 0);
  assert.equal(lineasActualizadas.length, 0);
});
