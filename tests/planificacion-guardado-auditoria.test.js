const test = require('node:test');
const assert = require('node:assert/strict');
const {
  guardarPlanificacionEnTransaccion,
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
    ingresoBrutoEstimado: 6000,
    ingresoNetoEstimado: 5400,
    costoProduccionEstimado: 1500,
    margenBrutoEstimado: 3900,
    margenBrutoActualizado: 3900,
    estado: 'cerrada',
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
    estado: 'cerrada',
    escenarioOriginal: true,
    escenarioBloqueadoPorId: null,
    cerradaPor: 'usuario-cierre',
    cerradaAt: fechaBase,
    motivoCierre: 'Cierre aprobado',
    createdAt: fechaBase,
    updatedAt: fechaBase,
    lineas: [crearLinea()],
    ...overrides,
  };
}

function crearRequest(overrides = {}) {
  return {
    origen: 'web',
    motivo: 'Intento de ajuste posterior',
    planificacion: {
      id: 'plan-1',
      clienteId: 'cliente-1',
      campaniaErpId: 'campania-26',
      nombre: 'Plan modificado',
      estado: 'borrador',
      escenarioOriginal: false,
      lineas: [crearLinea({ estado: 'borrador', precioVentaEstimado: 250 })],
      createdAt: fechaBase.toISOString(),
      updatedAt: fechaBase.toISOString(),
    },
    ...overrides,
  };
}

function crearTx(existente) {
  const auditorias = [];
  const upserts = [];
  const deleteManyLineas = [];
  const createManyLineas = [];

  const tx = {
    planificacionAgricola: {
      findUnique: async () => existente,
      findFirst: async () => null,
      upsert: async (args) => {
        upserts.push(args);
        return args.update;
      },
      findUniqueOrThrow: async () => existente,
    },
    planificacionAgricolaLinea: {
      deleteMany: async (args) => {
        deleteManyLineas.push(args);
        return { count: 1 };
      },
      createMany: async (args) => {
        createManyLineas.push(args);
        return { count: args.data.length };
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
    upserts,
    deleteManyLineas,
    createManyLineas,
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

test('guardarPlanificacionEnTransaccion audita y bloquea edicion de planificacion cerrada', async () => {
  const { tx, auditorias, upserts, deleteManyLineas, createManyLineas } = crearTx(crearPlanificacion());

  const error = await capturarErrorAsync(
    () => guardarPlanificacionEnTransaccion(tx, 'plan-1', crearRequest(), {
      id: 'usuario-1',
      email: 'admin@agro.test',
    }),
  );

  assert.match(error.message, /cerrada o deshabilitada/);
  assert.equal(error.statusCode, 409);
  assert.equal(upserts.length, 0);
  assert.equal(deleteManyLineas.length, 0);
  assert.equal(createManyLineas.length, 0);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, 'bloquear_edicion');
  assert.equal(auditorias[0].usuarioId, 'usuario-1');
  assert.equal(auditorias[0].origen, 'web');
  assert.equal(auditorias[0].motivo, 'Intento de ajuste posterior');
  assert.equal(auditorias[0].valoresAntes.estado, 'cerrada');
  assert.equal(auditorias[0].valoresAntes.lineas[0].precioVentaEstimado, 200);
});

test('guardarPlanificacionEnTransaccion usa motivo default al bloquear edicion de planificacion deshabilitada', async () => {
  const { tx, auditorias, upserts, deleteManyLineas, createManyLineas } = crearTx(crearPlanificacion({
    estado: 'deshabilitada',
    escenarioOriginal: false,
    escenarioBloqueadoPorId: 'plan-cerrado',
    lineas: [crearLinea({ estado: 'deshabilitada' })],
  }));

  await assert.rejects(
    () => guardarPlanificacionEnTransaccion(tx, 'plan-1', crearRequest({ motivo: undefined }), {
      id: 'usuario-2',
    }),
    /cerrada o deshabilitada/,
  );

  assert.equal(upserts.length, 0);
  assert.equal(deleteManyLineas.length, 0);
  assert.equal(createManyLineas.length, 0);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].accion, 'bloquear_edicion');
  assert.equal(auditorias[0].motivo, 'Intento de modificar planificacion deshabilitada.');
  assert.equal(auditorias[0].valoresAntes.estado, 'deshabilitada');
  assert.equal(auditorias[0].valoresAntes.escenarioBloqueadoPorId, 'plan-cerrado');
});
