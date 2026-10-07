const test = require('node:test');
const assert = require('node:assert/strict');
const {
  congelarLineaPlanificacionParaCierre,
  congelarPlanificacionParaCierre,
  extraerSupuestosCongeladosLinea,
  recalcularLineaPlanificacionPersistida,
  validarCabeceraPlanificacion,
  validarLineasPlanificacion,
  validarPlanificacionTieneLineasParaCierre,
} = require('../apps/api/dist/services/planificacion/validacionesPlanificacion');

function crearLinea(overrides = {}) {
  return {
    id: 'linea-1',
    planificacionId: 'plan-1',
    empresaErpId: 'empresa-1',
    campoAppId: 'campo-1',
    loteAppId: 'lote-1',
    actividadAppId: 'actividad-1',
    destinoVenta: 'Puerto',
    destinoVentaManual: false,
    precioVentaEstimado: 200,
    precioVentaManual: false,
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    gastosComercialesEstimados: 600,
    protocoloId: 'protocolo-1',
    costoProduccionEstimado: 1500,
    ingresoBrutoEstimado: 0,
    ingresoNetoEstimado: 0,
    margenBrutoEstimado: 0,
    estado: 'borrador',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearPlanificacion(overrides = {}) {
  return {
    id: 'plan-1',
    clienteId: 'cliente-1',
    campaniaErpId: 'campania-26',
    nombre: 'Plan campaña 26',
    estado: 'borrador',
    escenarioOriginal: false,
    lineas: [crearLinea()],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function lotesPorId(entries = [['lote-1', { id: 'lote-1', nombre: 'Lote 1', superficieTotal: 100 }]]) {
  return new Map(entries);
}

test('validarCabeceraPlanificacion exige cliente y campania y bloquea estados finales por guardado comun', () => {
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ campaniaErpId: '' })), /campaniaErpId/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ estado: 'cerrada' })), /endpoint especifico de cierre/);
  assert.throws(() => validarCabeceraPlanificacion(crearPlanificacion({ estado: 'deshabilitada' })), /endpoint especifico de cierre/);
});

test('validarLineasPlanificacion permite hectareas cero en borrador pero no en cierre', () => {
  const planificacion = crearPlanificacion({
    lineas: [crearLinea({ hectareasPlanificadas: 0 })],
  });

  assert.doesNotThrow(() => validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }));
  assert.throws(() => validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: false,
    lotesPorId: lotesPorId(),
  }), /mayores a cero para cerrar/);
});

test('validarLineasPlanificacion rechaza lote inexistente o hectareas mayores a superficie total', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion(), {
    permitirHectareasCero: true,
    lotesPorId: new Map(),
  }), /lote valido del cliente/);

  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ hectareasPlanificadas: 101 })],
  }), {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }), /no pueden superar su superficie total/);
});

test('validarLineasPlanificacion rechaza valores economicos negativos o no finitos', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ rindeEstimado: -1 })],
  }), { permitirHectareasCero: true, lotesPorId: lotesPorId() }), /Rinde, precio, gastos y costos no pueden ser negativos/);

  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [crearLinea({ precioVentaEstimado: Number.NaN })],
  }), { permitirHectareasCero: true, lotesPorId: lotesPorId() }), /Rinde, precio, gastos y costos no pueden ser negativos/);
});

test('validarLineasPlanificacion rechaza duplicados por campania, campo, lote y actividad', () => {
  assert.throws(() => validarLineasPlanificacion(crearPlanificacion({
    lineas: [
      crearLinea({ id: 'linea-1' }),
      crearLinea({ id: 'linea-2' }),
    ],
  }), {
    permitirHectareasCero: true,
    lotesPorId: lotesPorId(),
  }), /No se puede repetir la misma actividad/);
});

test('validarPlanificacionTieneLineasParaCierre exige al menos una linea', () => {
  assert.throws(() => validarPlanificacionTieneLineasParaCierre(crearPlanificacion({ lineas: [] })), /al menos una linea/);
});

test('recalcularLineaPlanificacionPersistida recalcula bruto, neto y margen preservando margen actualizado existente', () => {
  const recalculada = recalcularLineaPlanificacionPersistida(crearLinea({
    hectareasPlanificadas: 10,
    rindeEstimado: 3,
    precioVentaEstimado: 200,
    gastosComercialesEstimados: 600,
    costoProduccionEstimado: 1500,
    margenBrutoActualizado: 999,
  }));

  assert.equal(recalculada.ingresoBrutoEstimado, 6000);
  assert.equal(recalculada.ingresoNetoEstimado, 5400);
  assert.equal(recalculada.margenBrutoEstimado, 3900);
  assert.equal(recalculada.margenBrutoActualizado, 999);
});

test('congelarLineaPlanificacionParaCierre marca la linea cerrada y recalcula importes desde supuestos copiados', () => {
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    estado: 'aprobada',
    hectareasPlanificadas: 20,
    rindeEstimado: 4,
    precioVentaEstimado: 250,
    gastosComercialesEstimados: 1200,
    costoProduccionEstimado: 5000,
    ingresoBrutoEstimado: 1,
    ingresoNetoEstimado: 1,
    margenBrutoEstimado: 1,
  }));

  assert.equal(congelada.estado, 'cerrada');
  assert.equal(congelada.ingresoBrutoEstimado, 20000);
  assert.equal(congelada.ingresoNetoEstimado, 18800);
  assert.equal(congelada.margenBrutoEstimado, 13800);
  assert.equal(congelada.margenBrutoActualizado, 13800);
});

test('congelarPlanificacionParaCierre convierte el escenario en original y cierra todas las lineas', () => {
  const congelada = congelarPlanificacionParaCierre(crearPlanificacion({
    estado: 'aprobada',
    escenarioOriginal: false,
    escenarioBloqueadoPorId: 'otro-plan',
    lineas: [
      crearLinea({ id: 'linea-1', estado: 'aprobada' }),
      crearLinea({ id: 'linea-2', loteAppId: 'lote-2', actividadAppId: 'actividad-2', estado: 'en_revision' }),
    ],
  }));

  assert.equal(congelada.estado, 'cerrada');
  assert.equal(congelada.escenarioOriginal, true);
  assert.equal(congelada.escenarioBloqueadoPorId, undefined);
  assert.deepEqual(congelada.lineas.map((linea) => linea.estado), ['cerrada', 'cerrada']);
});

test('extraerSupuestosCongeladosLinea deja explicito el snapshot economico que no debe cambiar por padrones futuros', () => {
  const linea = congelarLineaPlanificacionParaCierre(crearLinea({
    campoErpId: 'empresa:1:campo:10',
    loteErpId: 'empresa:1:lote:20',
    actividadErpId: 'actividad:30',
    cultivoErpId: 'empresa:1:cultivo:40',
    destinoReferenciaId: 'destino-1',
    destinoVenta: 'Puerto Norte',
    precioReferenciaId: 'precio-1',
    precioVentaEstimado: 210,
    precioVentaManual: false,
    hectareasPlanificadas: 15,
    rindeEstimado: 3.2,
    gastosComercialesReferenciaId: 'gasto-1',
    gastosComercialesEstimados: 780,
    gastosComercialesSnapshot: {
      origen: 'referencia',
      referenciaId: 'gasto-1',
      items: [],
      totalEstimado: 780,
    },
    protocoloId: 'protocolo-1',
    costoProduccionEstimado: 2400,
  }));

  assert.deepEqual(extraerSupuestosCongeladosLinea(linea), {
    empresaErpId: 'empresa-1',
    campoAppId: 'campo-1',
    campoErpId: 'empresa:1:campo:10',
    loteAppId: 'lote-1',
    loteErpId: 'empresa:1:lote:20',
    actividadAppId: 'actividad-1',
    actividadErpId: 'actividad:30',
    cultivoErpId: 'empresa:1:cultivo:40',
    destinoReferenciaId: 'destino-1',
    destinoVenta: 'Puerto Norte',
    destinoVentaManual: false,
    destinoVentaSnapshot: {
      origen: 'referencia',
      referenciaId: 'destino-1',
      destinoVenta: 'Puerto Norte',
    },
    precioReferenciaId: 'precio-1',
    precioVentaEstimado: 210,
    precioVentaManual: false,
    precioVentaSnapshot: {
      origen: 'referencia',
      referenciaId: 'precio-1',
      valor: 210,
    },
    hectareasPlanificadas: 15,
    rindeEstimado: 3.2,
    gastosComercialesReferenciaId: 'gasto-1',
    gastosComercialesEstimados: 780,
    gastosComercialesSnapshot: {
      origen: 'referencia',
      referenciaId: 'gasto-1',
      items: [],
      totalEstimado: 780,
    },
    protocoloId: 'protocolo-1',
    protocoloSnapshot: {
      origen: 'referencia',
      protocoloId: 'protocolo-1',
      costoEstimadoPorHa: 160,
      costoTotalEstimado: 2400,
      etapas: [],
    },
    ingresoBrutoEstimado: 10080,
    ingresoNetoEstimado: 9300,
    costoProduccionEstimado: 2400,
    margenBrutoEstimado: 6900,
    margenBrutoActualizado: 6900,
  });
});

test('congelarLineaPlanificacionParaCierre guarda detalle de items si el gasto viene de referencia', () => {
  const { congelarLineaPlanificacionParaCierre } = require('../apps/api/dist/services/planificacion/validacionesPlanificacion');
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    gastosComercialesReferenciaId: 'gasto-1',
    gastosComercialesEstimados: 780,
  }), new Map([
    ['gasto-1', {
      id: 'gasto-1',
      clienteId: 'cliente-1',
      campaniaErpId: 'campania-26',
      empresaErpId: 'empresa-1',
      actividadAppId: 'actividad-1',
      descripcion: 'Gastos puerto norte',
      items: [
        {
          conceptoGastoComercialId: 'concepto-1',
          conceptoNombre: 'Flete',
          valorPorTonelada: 20,
          unidadCalculo: 'Tn',
          moneda: 'USD',
        },
      ],
      activo: true,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    }],
  ]));

  assert.deepEqual(congelada.gastosComercialesSnapshot, {
    origen: 'referencia',
    referenciaId: 'gasto-1',
    descripcion: 'Gastos puerto norte',
    items: [{
      conceptoGastoComercialId: 'concepto-1',
      conceptoNombre: 'Flete',
      valorPorTonelada: 20,
      unidadCalculo: 'Tn',
      moneda: 'USD',
      observaciones: undefined,
    }],
    totalEstimado: 780,
  });
});

test('congelarLineaPlanificacionParaCierre guarda detalle comercial si destino y precio vienen de referencia', () => {
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    destinoReferenciaId: 'destino-1',
    destinoVenta: 'Puerto Norte',
    precioReferenciaId: 'precio-1',
    precioVentaEstimado: 210,
  }), new Map(), new Map(), {
    destinosPorId: new Map([
      ['destino-1', {
        id: 'destino-1',
        clienteId: 'cliente-1',
        empresaErpId: 'empresa-1',
        actividadAppId: 'actividad-1',
        actividadErpId: 'actividad:1',
        cultivoErpId: 'cultivo-1',
        destinoVenta: 'Puerto Norte',
        destinoVentaNormalizado: 'PUERTO NORTE',
        descripcion: 'Destino base',
        activo: true,
        origen: 'app',
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      }],
    ]),
    preciosPorId: new Map([
      ['precio-1', {
        id: 'precio-1',
        clienteId: 'cliente-1',
        actividadAppId: 'actividad-1',
        destinoVenta: 'Puerto Norte',
        valor: 210,
        moneda: 'USD',
        unidad: 'tn',
        fuente: 'Pizarra',
        observaciones: 'Semana 40',
        activo: true,
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      }],
    ]),
  });

  assert.deepEqual(congelada.destinoVentaSnapshot, {
    origen: 'referencia',
    referenciaId: 'destino-1',
    destinoVenta: 'Puerto Norte',
    descripcion: 'Destino base',
    empresaErpId: 'empresa-1',
    actividadAppId: 'actividad-1',
    actividadErpId: 'actividad:1',
    cultivoErpId: 'cultivo-1',
  });
  assert.deepEqual(congelada.precioVentaSnapshot, {
    origen: 'referencia',
    referenciaId: 'precio-1',
    destinoVenta: 'Puerto Norte',
    valor: 210,
    moneda: 'USD',
    unidad: 'tn',
    fuente: 'Pizarra',
    observaciones: 'Semana 40',
  });
});

test('congelarLineaPlanificacionParaCierre guarda solo valores comerciales si destino y precio son manuales', () => {
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    destinoReferenciaId: undefined,
    destinoVenta: 'Destino manual',
    destinoVentaManual: true,
    precioReferenciaId: undefined,
    precioVentaEstimado: 215,
    precioVentaManual: true,
  }));

  assert.deepEqual(congelada.destinoVentaSnapshot, {
    origen: 'manual',
    destinoVenta: 'Destino manual',
  });
  assert.deepEqual(congelada.precioVentaSnapshot, {
    origen: 'manual',
    valor: 215,
  });
});

test('congelarLineaPlanificacionParaCierre guarda solo valor total cuando el gasto es manual', () => {
  const { congelarLineaPlanificacionParaCierre } = require('../apps/api/dist/services/planificacion/validacionesPlanificacion');
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    gastosComercialesReferenciaId: undefined,
    gastosComercialesEstimados: 450,
  }));

  assert.deepEqual(congelada.gastosComercialesSnapshot, {
    origen: 'manual',
    items: [],
    totalEstimado: 450,
  });
});

test('congelarLineaPlanificacionParaCierre guarda detalle de labores e insumos si el protocolo existe', () => {
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    protocoloId: 'protocolo-1',
    hectareasPlanificadas: 10,
    costoProduccionEstimado: 1500,
  }), new Map(), new Map([
    ['protocolo-1', {
      id: 'protocolo-1',
      clienteId: 'cliente-1',
      nombre: 'Protocolo soja',
      descripcion: 'Paquete base',
      campaniaErpId: 'campania-26',
      actividadAppId: 'actividad-1',
      tipoFecha: 'relativa_siembra',
      costoEstimadoPorHa: 150,
      activo: true,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
      etapas: [{
        id: 'etapa-1',
        protocoloId: 'protocolo-1',
        estadioReferenciaId: 'estadio-1',
        estadioCodigo: 'VE',
        orden: 1,
        nombre: 'Siembra',
        labores: [{
          id: 'labor-1',
          etapaId: 'etapa-1',
          servicioAppId: 'servicio-1',
          indiceAplicacion: 1,
          nombre: 'Siembra directa',
          unidad: 'ha',
          cantidadPorHa: 1,
          costoUnitario: 80,
          costoPorHa: 80,
        }],
        insumos: [{
          id: 'insumo-1',
          etapaId: 'etapa-1',
          indiceAplicacion: 1,
          insumoAppId: 'insumo-app-1',
          insumoErpId: 'insumo-erp-1',
          nombre: 'Semilla soja',
          tipo: 'Semilla',
          unidad: 'kg',
          dosisPorHa: 50,
          precioUnitarioEstimado: 1.4,
          costoPorHa: 70,
        }],
      }],
    }],
  ]));

  assert.deepEqual(congelada.protocoloSnapshot, {
    origen: 'referencia',
    protocoloId: 'protocolo-1',
    nombre: 'Protocolo soja',
    descripcion: 'Paquete base',
    costoEstimadoPorHa: 150,
    costoTotalEstimado: 1500,
    etapas: [{
      id: 'etapa-1',
      protocoloId: 'protocolo-1',
      estadioReferenciaId: 'estadio-1',
      estadioCodigo: 'VE',
      orden: 1,
      nombre: 'Siembra',
      labores: [{
        id: 'labor-1',
        etapaId: 'etapa-1',
        servicioAppId: 'servicio-1',
        indiceAplicacion: 1,
        nombre: 'Siembra directa',
        unidad: 'ha',
        cantidadPorHa: 1,
        costoUnitario: 80,
        costoPorHa: 80,
      }],
      insumos: [{
        id: 'insumo-1',
        etapaId: 'etapa-1',
        indiceAplicacion: 1,
        insumoAppId: 'insumo-app-1',
        insumoErpId: 'insumo-erp-1',
        nombre: 'Semilla soja',
        tipo: 'Semilla',
        unidad: 'kg',
        dosisPorHa: 50,
        precioUnitarioEstimado: 1.4,
        costoPorHa: 70,
      }],
    }],
  });
});

test('congelarLineaPlanificacionParaCierre guarda solo costo si el costo productivo es manual', () => {
  const congelada = congelarLineaPlanificacionParaCierre(crearLinea({
    protocoloId: undefined,
    hectareasPlanificadas: 20,
    costoProduccionEstimado: 3000,
  }));

  assert.deepEqual(congelada.protocoloSnapshot, {
    origen: 'manual',
    costoEstimadoPorHa: 150,
    costoTotalEstimado: 3000,
    etapas: [],
  });
});
