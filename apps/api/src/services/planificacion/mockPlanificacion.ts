import type {
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  PlanificacionSnapshot,
  ProtocoloProductivoDetalle,
  ProtocolosSnapshot,
} from '@agro/tipos';

let snapshotDemo: PlanificacionSnapshot | null = null;
let protocolosDetalleDemo: ProtocoloProductivoDetalle[] | null = null;

function crearErrorValidacion(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;

  return error;
}

function validarLineasUnicasPorCampaniaCampoLoteActividad(request: GuardarPlanificacionRequest) {
  const claves = new Set<string>();

  for (const linea of request.planificacion.lineas) {
    const clave = [
      request.planificacion.campaniaErpId,
      linea.campoPlanificacionId,
      linea.lotePlanificacionId,
      linea.actividadErpId,
    ].join('|');

    if (claves.has(clave)) {
      throw crearErrorValidacion('No se puede repetir la misma actividad para una misma campania, campo y lote.');
    }

    claves.add(clave);
  }
}

function calcularCostoProtocolo(protocolo: ProtocoloProductivoDetalle) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + labor.costoPorHa, 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + insumo.costoPorHa, 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}

export function obtenerProtocolosDemo(clienteId = 'cliente-demo'): ProtocolosSnapshot {
  if (!protocolosDetalleDemo) {
    protocolosDetalleDemo = [
      {
        id: 'protocolo-girasol-media',
        clienteId,
        nombre: 'Girasol tecnologia media',
        descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        zonaErpId: 'empresa:mock:zona:34',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        costoEstimadoPorHa: 520,
        activo: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
        etapas: [
          {
            id: 'etapa-barbecho',
            protocoloId: 'protocolo-girasol-media',
            orden: 1,
            nombre: 'Barbecho',
            descripcion: 'Control quimico previo a siembra',
            labores: [
              {
                id: 'labor-pulverizacion-barbecho',
                etapaId: 'etapa-barbecho',
                nombre: 'Pulverizacion',
                unidad: 'ha',
                cantidadPorHa: 1,
                costoUnitario: 18,
                costoPorHa: 18,
                momentoEstimado: 'Pre siembra',
              },
            ],
            insumos: [
              {
                id: 'insumo-24d-barbecho',
                etapaId: 'etapa-barbecho',
                insumoPlanificacionId: 'insumo-planificacion-24d',
                insumoErpId: 'empresa:mock:insumo:674',
                nombre: '2.4 D 100%',
                tipo: 'Herbicida',
                unidad: 'l',
                dosisPorHa: 0.5,
                precioUnitarioEstimado: 6.82,
                costoPorHa: 3.41,
                momentoEstimado: 'Pre siembra',
              },
            ],
          },
          {
            id: 'etapa-siembra',
            protocoloId: 'protocolo-girasol-media',
            orden: 2,
            nombre: 'Siembra',
            descripcion: 'Implantacion del cultivo',
            labores: [
              {
                id: 'labor-siembra',
                etapaId: 'etapa-siembra',
                nombre: 'Siembra contratista',
                unidad: 'ha',
                cantidadPorHa: 1,
                costoUnitario: 62,
                costoPorHa: 62,
                momentoEstimado: 'Siembra',
              },
            ],
            insumos: [
              {
                id: 'insumo-semilla-girasol',
                etapaId: 'etapa-siembra',
                insumoPlanificacionId: 'insumo-planificacion-semilla-girasol',
                nombre: 'Semilla girasol',
                tipo: 'Semilla',
                unidad: 'bolsa',
                dosisPorHa: 0.18,
                precioUnitarioEstimado: 260,
                costoPorHa: 46.8,
                momentoEstimado: 'Siembra',
              },
            ],
          },
        ],
      },
    ];
  }

  return {
    protocolos: protocolosDetalleDemo,
    sincronizadoEn: new Date().toISOString(),
  };
}

export function obtenerPlanificacionDemo(clienteId = 'cliente-demo'): PlanificacionSnapshot {
  if (snapshotDemo) {
    return snapshotDemo;
  }

  const ahora = new Date().toISOString();
  const ingresoBrutoEstimado = 60 * 2.4 * 315;
  const gastosComercialesEstimados = 60 * 42;
  const ingresoNetoEstimado = ingresoBrutoEstimado - gastosComercialesEstimados;
  const costoProduccionEstimado = 60 * 520;

  snapshotDemo = {
    sincronizadoEn: ahora,
    camposPlanificacion: [
      {
        id: 'campo-planificacion-erp-241',
        clienteId,
        empresaErpId: 'empresa:mock',
        campoErpId: 'empresa:mock:campo:241',
        nombre: 'LA PROVIDENCIA',
        codigoInterno: '00006',
        zonaErpId: 'empresa:mock:zona:34',
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: 'campo-planificacion-provisorio-1',
        clienteId,
        empresaErpId: 'empresa:mock',
        nombre: 'CAMPO NUEVO A REGISTRAR',
        codigoInterno: 'TEMP-001',
        estadoVinculacion: 'provisorio',
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    lotesPlanificacion: [
      {
        id: 'lote-planificacion-erp-724',
        clienteId,
        campoPlanificacionId: 'campo-planificacion-erp-241',
        loteErpId: 'empresa:mock:lote:724',
        nombre: 'CABALLO LOCO 1',
        codigoInterno: 'CL1',
        superficieTotal: 60,
        superficieProductiva: 60,
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: 'lote-planificacion-provisorio-1',
        clienteId,
        campoPlanificacionId: 'campo-planificacion-provisorio-1',
        nombre: 'LOTE NORTE',
        codigoInterno: 'TEMP-NORTE',
        superficieTotal: 42,
        superficieProductiva: 39,
        estadoVinculacion: 'provisorio',
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    destinosReferencia: [
      {
        id: 'destino-girasol-puerto-quequen',
        clienteId,
        empresaErpId: 'empresa:mock',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        campoErpId: 'empresa:mock:campo:241',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        destinoVenta: 'Puerto Quequen',
        descripcion: 'Destino sugerido para girasol de LA PROVIDENCIA',
        prioridad: 1,
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: 'destino-girasol-acopio-local',
        clienteId,
        empresaErpId: 'empresa:mock',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        destinoVenta: 'Acopio local',
        descripcion: 'Destino alternativo para girasol',
        prioridad: 2,
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    preciosReferencia: [
      {
        id: 'precio-girasol-quequen-planificado',
        clienteId,
        campaniaErpId: 'empresa:mock:campania:961',
        empresaErpId: 'empresa:mock',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        destinoVenta: 'Puerto Quequen',
        tipoPrecio: 'planificado',
        valor: 315,
        moneda: 'USD',
        unidad: 'tn',
        fechaVigenciaDesde: ahora,
        fuente: 'manual',
        observaciones: 'Precio demo para validar margen bruto',
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    gastosComercialesReferencia: [
      {
        id: 'gastos-girasol-providencia-quequen',
        clienteId,
        empresaErpId: 'empresa:mock',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        campoErpId: 'empresa:mock:campo:241',
        actividadErpId: 'empresa:mock:actividad:48',
        destinoVenta: 'Puerto Quequen',
        descripcion: 'Flete y acondicionamiento girasol a Puerto Quequen',
        items: [
          { concepto: 'Flete', tipoCalculo: 'por_ha', valor: 32, moneda: 'USD', unidad: 'ha' },
          { concepto: 'Acondicionamiento', tipoCalculo: 'por_ha', valor: 7, moneda: 'USD', unidad: 'ha' },
          { concepto: 'Comision comercial', tipoCalculo: 'por_ha', valor: 3, moneda: 'USD', unidad: 'ha' },
        ],
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    protocolos: [
      {
        id: 'protocolo-girasol-media',
        clienteId,
        nombre: 'Girasol tecnologia media',
        descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        zonaErpId: 'empresa:mock:zona:34',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        costoEstimadoPorHa: 520,
        activo: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
      },
      {
        id: 'protocolo-girasol-zona',
        clienteId,
        nombre: 'Girasol zona general',
        descripcion: 'Girasol - protocolo general para zona',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        zonaErpId: 'empresa:mock:zona:34',
        costoEstimadoPorHa: 500,
        activo: true,
        createdAt: '2026-01-10T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'protocolo-girasol-global',
        clienteId,
        nombre: 'Girasol base',
        descripcion: 'Girasol - protocolo base sin campo asignado',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        costoEstimadoPorHa: 470,
        activo: true,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-06-15T10:00:00.000Z',
      },
    ],
    planificaciones: [
      {
        id: 'planificacion-25-26-demo',
        clienteId,
        campaniaErpId: 'empresa:mock:campania:961',
        nombre: 'Planificacion agricola demo',
        descripcion: 'Primera planilla para validar ingresos, costos y margen bruto.',
        estado: 'borrador',
        createdAt: ahora,
        updatedAt: ahora,
        lineas: [
          {
            id: 'linea-planificacion-1',
            planificacionId: 'planificacion-25-26-demo',
            empresaErpId: 'empresa:mock',
            campoPlanificacionId: 'campo-planificacion-erp-241',
            campoErpId: 'empresa:mock:campo:241',
            lotePlanificacionId: 'lote-planificacion-erp-724',
            loteErpId: 'empresa:mock:lote:724',
            actividadErpId: 'empresa:mock:actividad:48',
            cultivoErpId: 'empresa:mock:cultivo:577',
            destinoReferenciaId: 'destino-girasol-puerto-quequen',
            destinoVenta: 'Puerto Quequen',
            destinoVentaManual: false,
            precioReferenciaId: 'precio-girasol-quequen-planificado',
            precioVentaEstimado: 315,
            precioVentaManual: false,
            hectareasPlanificadas: 60,
            rindeEstimado: 2.4,
            gastosComercialesReferenciaId: 'gastos-girasol-providencia-quequen',
            gastosComercialesEstimados,
            protocoloId: 'protocolo-girasol-media',
            ingresoBrutoEstimado,
            ingresoNetoEstimado,
            costoProduccionEstimado,
            margenBrutoEstimado: ingresoNetoEstimado - costoProduccionEstimado,
            margenBrutoActualizado: ingresoNetoEstimado - costoProduccionEstimado,
            estado: 'borrador',
            createdAt: ahora,
            updatedAt: ahora,
          },
        ],
      },
    ],
  };

  return snapshotDemo as PlanificacionSnapshot;
}

export function guardarPlanificacionDemo(id: string, request: GuardarPlanificacionRequest): GuardarPlanificacionResponse {
  const snapshot = obtenerPlanificacionDemo(request.planificacion.clienteId);
  const existente = snapshot.planificaciones.find((planificacion) => planificacion.id === id);

  if (existente?.estado === 'cerrada') {
    throw crearErrorValidacion('La planificacion esta cerrada y no puede modificarse.');
  }

  if (request.planificacion.estado === 'cerrada') {
    throw crearErrorValidacion('El cierre debe ejecutarse por el flujo especifico de cierre.');
  }

  validarLineasUnicasPorCampaniaCampoLoteActividad(request);

  const ahora = new Date().toISOString();
  const planificacionActualizada = {
    ...request.planificacion,
    updatedAt: ahora,
    lineas: request.planificacion.lineas.map((linea) => ({ ...linea, updatedAt: ahora })),
  };
  const indice = snapshot.planificaciones.findIndex((planificacion) => planificacion.id === id);

  if (indice >= 0) {
    snapshot.planificaciones[indice] = planificacionActualizada;
  } else {
    snapshot.planificaciones.push(planificacionActualizada);
  }

  snapshot.sincronizadoEn = ahora;

  return {
    planificacion: planificacionActualizada,
    auditado: true,
    mensaje: 'Borrador guardado en memoria demo. En produccion se persistira en PostgreSQL con auditoria transaccional.',
  };
}

export function guardarProtocoloDemo(id: string, request: GuardarProtocoloRequest): GuardarProtocoloResponse {
  const snapshot = obtenerPlanificacionDemo(request.protocolo.clienteId);
  const detalle = obtenerProtocolosDemo(request.protocolo.clienteId);
  const ahora = new Date().toISOString();
  const protocoloActualizado: ProtocoloProductivoDetalle = {
    ...request.protocolo,
    costoEstimadoPorHa: calcularCostoProtocolo(request.protocolo),
    updatedAt: ahora,
    etapas: request.protocolo.etapas.map((etapa, indice) => ({ ...etapa, orden: indice + 1 })),
  };
  const indiceDetalle = detalle.protocolos.findIndex((protocolo) => protocolo.id === id);

  if (indiceDetalle >= 0) {
    detalle.protocolos[indiceDetalle] = protocoloActualizado;
  } else {
    detalle.protocolos.push(protocoloActualizado);
  }

  const indiceResumen = snapshot.protocolos.findIndex((protocolo) => protocolo.id === id);
  const resumen = {
    id: protocoloActualizado.id,
    clienteId: protocoloActualizado.clienteId,
    nombre: protocoloActualizado.nombre,
    descripcion: protocoloActualizado.descripcion,
    actividadErpId: protocoloActualizado.actividadErpId,
    especieErpId: protocoloActualizado.especieErpId,
    zonaErpId: protocoloActualizado.zonaErpId,
    zonaPlanificacionId: protocoloActualizado.zonaPlanificacionId,
    campoPlanificacionId: protocoloActualizado.campoPlanificacionId,
    costoEstimadoPorHa: protocoloActualizado.costoEstimadoPorHa,
    activo: protocoloActualizado.activo,
    createdAt: protocoloActualizado.createdAt,
    updatedAt: protocoloActualizado.updatedAt,
  };

  if (indiceResumen >= 0) {
    snapshot.protocolos[indiceResumen] = resumen;
  } else {
    snapshot.protocolos.push(resumen);
  }

  return {
    protocolo: protocoloActualizado,
    auditado: true,
    mensaje: 'Protocolo guardado en memoria demo. En produccion se persistira con auditoria transaccional.',
  };
}
