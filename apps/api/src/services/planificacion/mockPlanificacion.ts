import type {
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  PlanificacionSnapshot,
  ProtocoloProductivoDetalle,
  ProtocolosSnapshot,
} from '@agro/tipos';

const estadiosReferenciaDemo = [
  { id: 'estadio-semilla-108', idEstadio: 108, codigo: 'BQ1', nombre: 'Barbecho Quimico 1', ordenCronologico: 4, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-109', idEstadio: 109, codigo: 'Si', nombre: 'Siembra', ordenCronologico: 9, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-111', idEstadio: 111, codigo: 'Pr2', nombre: 'Proteccion 1', ordenCronologico: 12, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-112', idEstadio: 112, codigo: 'COS', nombre: 'Cosecha', ordenCronologico: 26, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-113', idEstadio: 113, codigo: 'BM1', nombre: 'Barbecho Mecanico 1', ordenCronologico: 1, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-114', idEstadio: 114, codigo: 'BM2', nombre: 'Barbecho Mecanico 2', ordenCronologico: 2, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-115', idEstadio: 115, codigo: 'BQ2', nombre: 'Barbecho Quimico 2', ordenCronologico: 5, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-116', idEstadio: 116, codigo: 'BQ3', nombre: 'Barbecho Quimico 3', ordenCronologico: 6, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-117', idEstadio: 117, codigo: 'Pr1', nombre: 'Preemergente', ordenCronologico: 10, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-118', idEstadio: 118, codigo: 'FERT1', nombre: 'Fertilizacion 1', ordenCronologico: 11, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-119', idEstadio: 119, codigo: 'Pr3', nombre: 'Proteccion 2', ordenCronologico: 19, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-120', idEstadio: 120, codigo: 'FERT2', nombre: 'Fertilizacion 2', ordenCronologico: 20, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-121', idEstadio: 121, codigo: 'Pr4', nombre: 'Proteccion 3', ordenCronologico: 21, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-122', idEstadio: 122, codigo: 'Pr5', nombre: 'Proteccion 4', ordenCronologico: 23, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-123', idEstadio: 123, codigo: 'EMB', nombre: 'Embolsado', ordenCronologico: 27, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-124', idEstadio: 124, codigo: 'Pr6', nombre: 'Proteccion 5', ordenCronologico: 24, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-125', idEstadio: 125, codigo: 'BQ4', nombre: 'Barbecho Quimico 4', ordenCronologico: 7, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-126', idEstadio: 126, codigo: 'Pr7', nombre: 'Proteccion 6', ordenCronologico: 25, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-127', idEstadio: 127, codigo: 'LE1', nombre: 'Labores Especiales 1', ordenCronologico: 22, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-128', idEstadio: 128, codigo: 'BM3', nombre: 'Barbecho Mecanico 3', ordenCronologico: 3, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-129', idEstadio: 129, codigo: 'BQ5', nombre: 'Barbecho Quimico 5', ordenCronologico: 8, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-130', idEstadio: 130, codigo: 'CORT1', nombre: 'Corte 1', ordenCronologico: 13, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-131', idEstadio: 131, codigo: 'CORT2', nombre: 'Corte 2', ordenCronologico: 14, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-132', idEstadio: 132, codigo: 'CORT3', nombre: 'Corte 3', ordenCronologico: 15, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-133', idEstadio: 133, codigo: 'CORT4', nombre: 'Corte 4', ordenCronologico: 16, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-134', idEstadio: 134, codigo: 'CORT5', nombre: 'Corte 5', ordenCronologico: 17, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-135', idEstadio: 135, codigo: 'CORT6', nombre: 'Corte 6', ordenCronologico: 18, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-136', idEstadio: 136, codigo: 'Pr8', nombre: 'Proteccion 7', ordenCronologico: 26, activo: true, origen: 'semilla' as const },
  { id: 'estadio-semilla-137', idEstadio: 137, codigo: 'LE2', nombre: 'Labores Especiales 2', ordenCronologico: 23, activo: true, origen: 'semilla' as const },
].sort((a, b) => a.ordenCronologico - b.ordenCronologico || a.idEstadio - b.idEstadio);

function crearLaboresReferenciaDemo(clienteId: string, ahora: string) {
  return [
    { id: 'labor-ref-pulverizacion', clienteId, codigo: 'PULV', nombre: 'Pulverizacion', unidadSugerida: 'ha', costoUnitarioSugerido: 18, estadoVinculacion: 'provisorio' as const, activo: true, origen: 'semilla' as const, createdAt: ahora, updatedAt: ahora },
    { id: 'labor-ref-siembra', clienteId, codigo: 'SIEM', nombre: 'Siembra contratista', unidadSugerida: 'ha', costoUnitarioSugerido: 62, estadoVinculacion: 'provisorio' as const, activo: true, origen: 'semilla' as const, createdAt: ahora, updatedAt: ahora },
    { id: 'labor-ref-fertilizacion', clienteId, codigo: 'FERT', nombre: 'Fertilizacion', unidadSugerida: 'ha', costoUnitarioSugerido: 28, estadoVinculacion: 'provisorio' as const, activo: true, origen: 'semilla' as const, createdAt: ahora, updatedAt: ahora },
    { id: 'labor-ref-cosecha', clienteId, codigo: 'COSE', nombre: 'Cosecha', unidadSugerida: 'ha', costoUnitarioSugerido: 75, estadoVinculacion: 'provisorio' as const, activo: true, origen: 'semilla' as const, createdAt: ahora, updatedAt: ahora },
    { id: 'labor-ref-monitoreo', clienteId, codigo: 'MON', nombre: 'Monitoreo', unidadSugerida: 'ha', costoUnitarioSugerido: 4, estadoVinculacion: 'provisorio' as const, activo: true, origen: 'semilla' as const, createdAt: ahora, updatedAt: ahora },
  ];
}

function crearConceptosGastosComercialesDemo(clienteId: string, ahora: string) {
  return [
    { id: 'concepto-gasto-flete', clienteId, codigo: 'FLETE', nombre: 'Flete', nombreNormalizado: 'FLETE', descripcion: 'Transporte de cereal', activo: true, createdAt: ahora, updatedAt: ahora },
    { id: 'concepto-gasto-acondicionamiento', clienteId, codigo: 'ACOND', nombre: 'Acondicionamiento', nombreNormalizado: 'ACONDICIONAMIENTO', descripcion: 'Secado, zarandeo o acondicionamiento comercial', activo: true, createdAt: ahora, updatedAt: ahora },
    { id: 'concepto-gasto-comision', clienteId, codigo: 'COM', nombre: 'Comision comercial', nombreNormalizado: 'COMISION COMERCIAL', descripcion: 'Comision o intermediacion comercial', activo: true, createdAt: ahora, updatedAt: ahora },
    { id: 'concepto-gasto-secada', clienteId, codigo: 'SEC', nombre: 'Secada', nombreNormalizado: 'SECADA', activo: true, createdAt: ahora, updatedAt: ahora },
    { id: 'concepto-gasto-puerto-acopio', clienteId, codigo: 'PYA', nombre: 'Puerto / acopio', nombreNormalizado: 'PUERTO / ACOPIO', activo: true, createdAt: ahora, updatedAt: ahora },
    { id: 'concepto-gasto-otros', clienteId, codigo: 'OTROS', nombre: 'Otros gastos de venta', nombreNormalizado: 'OTROS GASTOS DE VENTA', activo: true, createdAt: ahora, updatedAt: ahora },
  ];
}

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
      linea.actividadPlanificacionId,
    ].join('|');

    if (claves.has(clave)) {
      throw crearErrorValidacion('No se puede repetir la misma actividad para una misma campania, campo y lote.');
    }

    claves.add(clave);
  }
}

function calcularCostoProtocolo(protocolo: ProtocoloProductivoDetalle) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + labor.cantidadPorHa * labor.costoUnitario * labor.indiceAplicacion, 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + insumo.dosisPorHa * insumo.precioUnitarioEstimado * insumo.indiceAplicacion, 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}

function validarFechasProtocolo(protocolo: ProtocoloProductivoDetalle) {
  const etapasSiembra = protocolo.etapas.filter((etapa) => ['siembra', 'siembra directa'].includes(etapa.nombre.trim().toLowerCase()));

  if (protocolo.tipoFecha === 'relativa_siembra') {
    for (const etapa of protocolo.etapas) {
      if (!Number.isInteger(etapa.diasDesdeSiembra)) {
        throw crearErrorValidacion('Las etapas relativas a siembra deben tener diasDesdeSiembra entero. Puede ser negativo.');
      }
    }

    if (etapasSiembra.length && !protocolo.fechaSiembra) {
      throw crearErrorValidacion('La fecha de siembra es obligatoria si el protocolo relativo tiene etapa Siembra o Siembra directa.');
    }

    for (const etapa of etapasSiembra) {
      if (etapa.diasDesdeSiembra !== 0) {
        throw crearErrorValidacion('La etapa Siembra o Siembra directa debe tener diasDesdeSiembra igual a 0.');
      }
    }
  }

  if (protocolo.tipoFecha === 'absoluta') {
    for (const etapa of protocolo.etapas) {
      if (!etapa.fechaObjetivo) {
        throw crearErrorValidacion('Las etapas absolutas deben tener fechaObjetivo.');
      }
    }
  }
}

function validarItemsProtocolo(protocolo: ProtocoloProductivoDetalle) {
  for (const etapa of protocolo.etapas) {
    if (!etapa.estadioReferenciaId) {
      throw crearErrorValidacion('Cada etapa del protocolo debe tener un estadio.');
    }

    for (const labor of etapa.labores) {
      if (!Number.isFinite(labor.indiceAplicacion) || labor.indiceAplicacion < 0 || labor.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de labores debe estar entre 0 y 1.');
      }
    }

    for (const insumo of etapa.insumos) {
      if (!Number.isFinite(insumo.indiceAplicacion) || insumo.indiceAplicacion < 0 || insumo.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de insumos debe estar entre 0 y 1.');
      }
    }
  }
}

export function obtenerProtocolosDemo(clienteId = 'cliente-demo'): ProtocolosSnapshot {
  if (!protocolosDetalleDemo) {
    protocolosDetalleDemo = [
      {
        id: 'protocolo-girasol-media',
        clienteId,
        nombre: 'Girasol tecnologia media',
        descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
        campaniaErpId: 'empresa:mock:campania:961',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        tipoFecha: 'relativa_siembra',
        fechaSiembra: '2026-10-15',
        zonaPlanificacionId: 'zona-planificacion-erp-34',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        costoEstimadoPorHa: 520,
        activo: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
        etapas: [
          {
            id: 'etapa-barbecho',
            protocoloId: 'protocolo-girasol-media',
            estadioReferenciaId: 'estadio-semilla-108',
            estadioCodigo: 'BQ1',
            orden: 1,
            nombre: 'Barbecho Quimico 1',
            descripcion: 'Control quimico previo a siembra',
            diasDesdeSiembra: -30,
            labores: [
              {
                id: 'labor-pulverizacion-barbecho',
                etapaId: 'etapa-barbecho',
                laborReferenciaId: 'labor-ref-pulverizacion',
                indiceAplicacion: 1,
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
                indiceAplicacion: 1,
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
            estadioReferenciaId: 'estadio-semilla-109',
            estadioCodigo: 'Si',
            orden: 2,
            nombre: 'Siembra',
            descripcion: 'Implantacion del cultivo',
            diasDesdeSiembra: 0,
            labores: [
              {
                id: 'labor-siembra',
                etapaId: 'etapa-siembra',
                laborReferenciaId: 'labor-ref-siembra',
                indiceAplicacion: 1,
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
                indiceAplicacion: 1,
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
  const gastosComercialesEstimados = 60 * 2.4 * 27;
  const ingresoNetoEstimado = ingresoBrutoEstimado - gastosComercialesEstimados;
  const costoProduccionEstimado = 60 * 520;

  snapshotDemo = {
    sincronizadoEn: ahora,
    conceptosGastosComerciales: crearConceptosGastosComercialesDemo(clienteId, ahora),
    camposPlanificacion: [
      {
        id: 'campo-planificacion-erp-241',
        clienteId,
        empresaErpId: 'empresa:mock',
        campoErpId: 'empresa:mock:campo:241',
        nombre: 'LA PROVIDENCIA',
        codigoInterno: '00006',
        zonaPlanificacionId: 'zona-planificacion-erp-34',
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
    especiesPlanificacion: [
      {
        id: 'especie-planificacion-girasol',
        clienteId,
        empresaErpId: 'empresa:mock',
        especieErpId: 'empresa:mock:especie:33',
        nombre: 'Girasol',
        codigoInterno: 'GIR',
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    actividadesPlanificacion: [
      {
        id: 'actividad-planificacion-girasol',
        clienteId,
        empresaErpId: 'empresa:mock',
        actividadErpId: 'empresa:mock:actividad:48',
        especiePlanificacionId: 'especie-planificacion-girasol',
        especieErpId: 'empresa:mock:especie:33',
        nombre: 'Girasol',
        codigoInterno: 'GIR',
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    insumosPlanificacion: [
      {
        id: 'insumo-planificacion-24d',
        clienteId,
        empresaErpId: 'empresa:mock',
        insumoErpId: 'empresa:mock:insumo:674',
        nombre: '2.4 D 100%',
        codigoInterno: '24D',
        tipo: 'Herbicida',
        unidad: 'l',
        precioUnitarioEstimado: 6.82,
        moneda: 'USD',
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: 'insumo-planificacion-semilla-girasol',
        clienteId,
        empresaErpId: 'empresa:mock',
        nombre: 'Semilla girasol',
        codigoInterno: 'SEM-GIR',
        tipo: 'Semilla',
        unidad: 'bolsa',
        precioUnitarioEstimado: 260,
        moneda: 'USD',
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
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        destinoVenta: 'Puerto Quequen',
        destinoVentaNormalizado: 'PUERTO QUEQUEN',
        descripcion: 'Destino sugerido para girasol de LA PROVIDENCIA',
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: 'destino-girasol-acopio-local',
        clienteId,
        empresaErpId: 'empresa:mock',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        especieErpId: 'empresa:mock:especie:33',
        destinoVenta: 'Acopio local',
        destinoVentaNormalizado: 'ACOPIO LOCAL',
        descripcion: 'Destino alternativo para girasol',
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    preciosReferencia: [
        {
          id: 'precio-girasol-quequen-planificado',
          clienteId,
          empresaErpId: 'empresa:mock',
          actividadPlanificacionId: 'actividad-planificacion-girasol',
          actividadErpId: 'empresa:mock:actividad:48',
          especieErpId: 'empresa:mock:especie:33',
          destinoVenta: 'Puerto Quequen',
          valor: 315,
          moneda: 'USD',
          unidad: 'tn',
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
        campaniaErpId: 'empresa:mock:campania:961',
        empresaErpId: 'empresa:mock',
        zonaPlanificacionId: 'zona-planificacion-erp-34',
        zonaErpId: 'empresa:mock:zona:34',
        campoPlanificacionId: 'campo-planificacion-erp-241',
        campoErpId: 'empresa:mock:campo:241',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        destinoVenta: 'Puerto Quequen',
        descripcion: 'Flete y acondicionamiento girasol a Puerto Quequen',
        items: [
          { conceptoGastoComercialId: 'concepto-gasto-flete', conceptoNombre: 'Flete', valorPorTonelada: 18, moneda: 'USD', observaciones: 'Valor demo por tonelada' },
          { conceptoGastoComercialId: 'concepto-gasto-acondicionamiento', conceptoNombre: 'Acondicionamiento', valorPorTonelada: 6, moneda: 'USD' },
          { conceptoGastoComercialId: 'concepto-gasto-comision', conceptoNombre: 'Comision comercial', valorPorTonelada: 3, moneda: 'USD' },
        ],
        activo: true,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
    estadiosReferencia: estadiosReferenciaDemo,
    laboresReferencia: crearLaboresReferenciaDemo(clienteId, ahora),
    protocolos: [
      {
        id: 'protocolo-girasol-media',
        clienteId,
        nombre: 'Girasol tecnologia media',
        descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
        campaniaErpId: 'empresa:mock:campania:961',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        tipoFecha: 'relativa_siembra',
        fechaSiembra: '2026-10-15',
        zonaPlanificacionId: 'zona-planificacion-erp-34',
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
        campaniaErpId: 'empresa:mock:campania:961',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        tipoFecha: 'relativa_siembra',
        fechaSiembra: '2026-10-15',
        zonaPlanificacionId: 'zona-planificacion-erp-34',
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
        campaniaErpId: 'empresa:mock:campania:961',
        actividadPlanificacionId: 'actividad-planificacion-girasol',
        actividadErpId: 'empresa:mock:actividad:48',
        tipoFecha: 'relativa_siembra',
        fechaSiembra: '2026-10-15',
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
            actividadPlanificacionId: 'actividad-planificacion-girasol',
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
  validarFechasProtocolo(request.protocolo);
  validarItemsProtocolo(request.protocolo);

  const snapshot = obtenerPlanificacionDemo(request.protocolo.clienteId);
  const detalle = obtenerProtocolosDemo(request.protocolo.clienteId);
  const ahora = new Date().toISOString();
  const protocoloActualizado: ProtocoloProductivoDetalle = {
    ...request.protocolo,
    costoEstimadoPorHa: calcularCostoProtocolo(request.protocolo),
    updatedAt: ahora,
    etapas: request.protocolo.etapas.map((etapa, indice) => ({ ...etapa, orden: etapa.orden || indice + 1 })),
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
    protocoloOrigenId: protocoloActualizado.protocoloOrigenId,
    campaniaErpId: protocoloActualizado.campaniaErpId,
    actividadPlanificacionId: protocoloActualizado.actividadPlanificacionId,
    actividadErpId: protocoloActualizado.actividadErpId,
    tipoFecha: protocoloActualizado.tipoFecha,
    fechaSiembra: protocoloActualizado.fechaSiembra,
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
