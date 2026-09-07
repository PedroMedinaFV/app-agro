import type {
  ActividadPlanificacion,
  CampoPlanificacion,
  EspeciePlanificacion,
  InsumoPlanificacion,
  LaborReferencia,
  LotePlanificacion,
  ZonaPlanificacion,
} from '@agro/tipos';
import { prisma } from '../../prisma';
import { listarEmpresasErpCliente } from '../erp/empresasCliente';

type PadronesPlanificacionPersistidos = {
  zonasPlanificacion: ZonaPlanificacion[];
  camposPlanificacion: CampoPlanificacion[];
  lotesPlanificacion: LotePlanificacion[];
  especiesPlanificacion: EspeciePlanificacion[];
  actividadesPlanificacion: ActividadPlanificacion[];
  insumosPlanificacion: InsumoPlanificacion[];
  laboresReferencia: LaborReferencia[];
};

function idDesdeErp(prefijo: string, erpId: string) {
  return `${prefijo}-${erpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

function normalizarCodigo(valor: string) {
  return valor
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

async function obtenerEmpresasCliente(clienteId: string) {
  const empresas = await listarEmpresasErpCliente(clienteId);

  return empresas.map((empresa) => empresa.empresaErpId);
}

/**
 * Materializa los padrones sincronizados de ALBOR como entidades operativas de Agro App.
 * La planificacion trabaja siempre contra IDs propios, aunque el origen sea ERP.
 */
export async function asegurarPadronesPlanificacionDesdeErp(
  clienteId: string,
  camposAsignados: string[] | null,
): Promise<void> {
  const ahora = new Date();
  const empresaErpIds = await obtenerEmpresasCliente(clienteId);
  const filtroCampos = {
    empresaErpId: { in: empresaErpIds },
    activo: true,
    ...(camposAsignados ? { erpId: { in: camposAsignados } } : {}),
  };
  const camposErp = await prisma.erpCampo.findMany({ where: filtroCampos });
  const campoErpIds = camposErp.map((campo) => campo.erpId);
  const idZonasUsadas = Array.from(
    new Set(camposErp.map((campo) => campo.idZona).filter((idZona): idZona is number => typeof idZona === 'number')),
  );
  const [zonasErp, lotesErp, especiesErp, actividadesErp, insumosErp, serviciosErp, unidadesMedida] = await Promise.all([
    prisma.erpZona.findMany({ where: { idZona: { in: idZonasUsadas }, activo: true }, distinct: ['idZona'] }),
    prisma.erpLote.findMany({ where: { campoErpId: { in: campoErpIds }, activo: true } }),
    prisma.erpEspecie.findMany({ where: { empresaErpId: 'global', activo: true } }),
    prisma.erpActividad.findMany({ where: { empresaErpId: 'global', activo: true } }),
    prisma.erpInsumo.findMany({ where: { empresaErpId: 'global', activo: true } }),
    prisma.erpServicio.findMany({ where: { empresaErpId: 'global', activo: true } }),
    prisma.erpUnidadMedida.findMany({ where: { empresaErpId: 'global', activo: true } }),
  ]);
  const zonasExistentes = await prisma.zonaPlanificacion.findMany({ where: { clienteId, zonaErpId: { not: null } } });
  const camposExistentes = await prisma.campoPlanificacion.findMany({ where: { clienteId, campoErpId: { not: null } } });
  const lotesExistentes = await prisma.lotePlanificacion.findMany({ where: { clienteId, loteErpId: { not: null } } });
  const especiesExistentes = await prisma.especiePlanificacion.findMany({ where: { clienteId, especieErpId: { not: null } } });
  const actividadesExistentes = await prisma.actividadPlanificacion.findMany({ where: { clienteId, actividadErpId: { not: null } } });
  const insumosExistentes = await prisma.insumoPlanificacion.findMany({ where: { clienteId, insumoErpId: { not: null } } });
  const laboresExistentes = await prisma.laborReferencia.findMany({ where: { clienteId, servicioErpId: { not: null } } });
  const zonaPorErpId = new Map(zonasExistentes.map((zona) => [zona.zonaErpId, zona.id]));
  const campoPorErpId = new Map(camposExistentes.map((campo) => [campo.campoErpId, campo.id]));
  const lotePorErpId = new Map(lotesExistentes.map((lote) => [lote.loteErpId, lote.id]));
  const especiePorErpId = new Map(especiesExistentes.map((especie) => [especie.especieErpId, especie.id]));
  const actividadPorErpId = new Map(actividadesExistentes.map((actividad) => [actividad.actividadErpId, actividad.id]));
  const insumoPorErpId = new Map(insumosExistentes.map((insumo) => [insumo.insumoErpId, insumo.id]));
  const laborPorErpId = new Map(laboresExistentes.map((labor) => [labor.servicioErpId, labor.id]));
  const unidadPorId = new Map(unidadesMedida.map((unidad) => [unidad.idUnidadMedida, unidad.codigo]));

  await prisma.zonaPlanificacion.createMany({
    skipDuplicates: true,
    data: zonasErp
      .filter((zona) => !zonaPorErpId.has(zona.erpId))
      .map((zona) => ({
        id: idDesdeErp('zona-planificacion', zona.erpId),
        clienteId,
        empresaErpId: 'global',
        zonaErpId: zona.erpId,
        nombre: zona.nombre,
        codigoInterno: normalizarCodigo(zona.codigo || zona.nombre),
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      })),
  });

  await prisma.especiePlanificacion.createMany({
    skipDuplicates: true,
    data: especiesErp
      .filter((especie) => !especiePorErpId.has(especie.erpId))
      .map((especie) => ({
        id: idDesdeErp('especie-planificacion', especie.erpId),
        clienteId,
        empresaErpId: 'global',
        especieErpId: especie.erpId,
        nombre: especie.nombre,
        codigoInterno: normalizarCodigo(especie.codigo || especie.nombre),
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      })),
  });

  const zonasPlanificacionActuales = await prisma.zonaPlanificacion.findMany({ where: { clienteId } });
  const especiesPlanificacionActuales = await prisma.especiePlanificacion.findMany({ where: { clienteId } });
  const zonaIdPorErpId = new Map(zonasPlanificacionActuales.map((zona) => [zona.zonaErpId, zona.id]));
  const especieIdPorErpId = new Map(especiesPlanificacionActuales.map((especie) => [especie.especieErpId, especie.id]));

  await prisma.campoPlanificacion.createMany({
    skipDuplicates: true,
    data: camposErp
      .filter((campo) => !campoPorErpId.has(campo.erpId))
      .map((campo) => {
        const zonaErpId = campo.idZona ? `zona:${campo.idZona}` : null;

        return {
          id: idDesdeErp('campo-planificacion', campo.erpId),
          clienteId,
          empresaErpId: campo.empresaErpId,
          campoErpId: campo.erpId,
          zonaPlanificacionId: zonaErpId ? zonaIdPorErpId.get(zonaErpId) : null,
          zonaErpId,
          nombre: campo.nombre,
          codigoInterno: normalizarCodigo(campo.codigo || campo.nombre),
          estadoVinculacion: 'vinculado_erp',
          createdAt: ahora,
          updatedAt: ahora,
        };
      }),
  });

  await prisma.actividadPlanificacion.createMany({
    skipDuplicates: true,
    data: actividadesErp
      .filter((actividad) => !actividadPorErpId.has(actividad.erpId))
      .map((actividad) => {
        const especieErpId = actividad.idEspecie ? `especie:${actividad.idEspecie}` : null;

        return {
          id: idDesdeErp('actividad-planificacion', actividad.erpId),
          clienteId,
          empresaErpId: 'global',
          actividadErpId: actividad.erpId,
          especiePlanificacionId: especieErpId ? especieIdPorErpId.get(especieErpId) : null,
          especieErpId,
          nombre: actividad.descripcion,
          codigoInterno: normalizarCodigo(actividad.codigo || actividad.descripcion),
          estadoVinculacion: 'vinculado_erp',
          createdAt: ahora,
          updatedAt: ahora,
        };
      }),
  });

  const camposPlanificacionActuales = await prisma.campoPlanificacion.findMany({ where: { clienteId } });
  const campoIdPorErpId = new Map(camposPlanificacionActuales.map((campo) => [campo.campoErpId, campo.id]));

  await prisma.lotePlanificacion.createMany({
    skipDuplicates: true,
    data: lotesErp
      .filter((lote) => !lotePorErpId.has(lote.erpId))
      .map((lote) => ({
        id: idDesdeErp('lote-planificacion', lote.erpId),
        clienteId,
        campoPlanificacionId: campoIdPorErpId.get(lote.campoErpId) || idDesdeErp('campo-planificacion', lote.campoErpId),
        loteErpId: lote.erpId,
        nombre: lote.nombre,
        codigoInterno: normalizarCodigo(lote.codigo || lote.nombre),
        superficieTotal: lote.areaHectareas,
        superficieProductiva: lote.hectareasProductivas ?? lote.areaHectareas,
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      })),
  });

  await prisma.insumoPlanificacion.createMany({
    skipDuplicates: true,
    data: insumosErp
      .filter((insumo) => !insumoPorErpId.has(insumo.erpId))
      .map((insumo) => ({
        id: idDesdeErp('insumo-planificacion', insumo.erpId),
        clienteId,
        empresaErpId: 'global',
        insumoErpId: insumo.erpId,
        nombre: insumo.nombre,
        codigoInterno: normalizarCodigo(insumo.codigo || insumo.nombre),
        tipo: insumo.idTipoInsumo ? `Tipo ${insumo.idTipoInsumo}` : null,
        unidad: insumo.idUnidadMedida ? unidadPorId.get(insumo.idUnidadMedida) || 'Unid' : 'Unid',
        precioUnitarioEstimado: insumo.precioUnitario ?? null,
        moneda: 'USD',
        estadoVinculacion: 'vinculado_erp',
        createdAt: ahora,
        updatedAt: ahora,
      })),
  });

  await prisma.laborReferencia.createMany({
    skipDuplicates: true,
    data: serviciosErp
      .filter((servicio) => !laborPorErpId.has(servicio.erpId))
      .map((servicio) => ({
        id: idDesdeErp('labor-referencia', servicio.erpId),
        clienteId,
        empresaErpId: 'global',
        servicioErpId: servicio.erpId,
        idServicio: servicio.idServicio,
        idTipoServicio: servicio.idTipoServicio,
        codigo: normalizarCodigo(servicio.codigo || servicio.descripcion),
        nombre: servicio.descripcion,
        descripcionAbreviada: servicio.descripcionAbreviada,
        idUnidadMedida: servicio.idUnidadMedida,
        idMoneda: servicio.idMoneda,
        unidadSugerida: servicio.idUnidadMedida ? unidadPorId.get(servicio.idUnidadMedida) || 'Ha' : 'Ha',
        costoUnitarioSugerido: servicio.precioUnitario,
        imputaDosis: servicio.imputaDosis,
        estadoVinculacion: 'vinculado_erp',
        activo: servicio.activo,
        origen: 'erp',
        fechaUltimaActualizacionErp: servicio.actualizadoEn,
        createdAt: ahora,
        updatedAt: ahora,
      })),
  });
}

export async function obtenerPadronesPlanificacionPersistidos(
  clienteId: string,
  camposAsignados: string[] | null,
): Promise<PadronesPlanificacionPersistidos> {
  const [
    zonas,
    campos,
    lotes,
    especies,
    actividades,
    insumos,
    labores,
  ] = await Promise.all([
    prisma.zonaPlanificacion.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
    prisma.campoPlanificacion.findMany({
      where: {
        clienteId,
        ...(camposAsignados ? { campoErpId: { in: camposAsignados } } : {}),
      },
      orderBy: [{ nombre: 'asc' }],
    }),
    prisma.lotePlanificacion.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
    prisma.especiePlanificacion.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
    prisma.actividadPlanificacion.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
    prisma.insumoPlanificacion.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
    prisma.laborReferencia.findMany({ where: { clienteId }, orderBy: [{ nombre: 'asc' }] }),
  ]);

  const camposPermitidosIds = new Set(campos.map((campo) => campo.id));

  return {
    zonasPlanificacion: zonas.map((zona) => ({
      id: zona.id,
      clienteId: zona.clienteId,
      empresaErpId: zona.empresaErpId,
      zonaErpId: zona.zonaErpId || undefined,
      nombre: zona.nombre,
      codigoInterno: zona.codigoInterno || undefined,
      estadoVinculacion: zona.estadoVinculacion as ZonaPlanificacion['estadoVinculacion'],
      createdAt: zona.createdAt.toISOString(),
      updatedAt: zona.updatedAt.toISOString(),
    })),
    camposPlanificacion: campos.map((campo) => ({
      id: campo.id,
      clienteId: campo.clienteId,
      empresaErpId: campo.empresaErpId,
      campoErpId: campo.campoErpId || undefined,
      nombre: campo.nombre,
      codigoInterno: campo.codigoInterno || undefined,
      zonaPlanificacionId: campo.zonaPlanificacionId || undefined,
      zonaErpId: campo.zonaErpId || (campo.zonaPlanificacionId ? zonas.find((zona) => zona.id === campo.zonaPlanificacionId)?.zonaErpId || undefined : undefined),
      estadoVinculacion: campo.estadoVinculacion as CampoPlanificacion['estadoVinculacion'],
      createdAt: campo.createdAt.toISOString(),
      updatedAt: campo.updatedAt.toISOString(),
    })),
    lotesPlanificacion: lotes.filter((lote) => camposPermitidosIds.has(lote.campoPlanificacionId)).map((lote) => ({
      id: lote.id,
      clienteId: lote.clienteId,
      campoPlanificacionId: lote.campoPlanificacionId,
      loteErpId: lote.loteErpId || undefined,
      nombre: lote.nombre,
      codigoInterno: lote.codigoInterno || undefined,
      superficieTotal: lote.superficieTotal,
      superficieProductiva: lote.superficieProductiva,
      estadoVinculacion: lote.estadoVinculacion as LotePlanificacion['estadoVinculacion'],
      createdAt: lote.createdAt.toISOString(),
      updatedAt: lote.updatedAt.toISOString(),
    })),
    especiesPlanificacion: especies.map((especie) => ({
      id: especie.id,
      clienteId: especie.clienteId,
      empresaErpId: especie.empresaErpId,
      especieErpId: especie.especieErpId || undefined,
      nombre: especie.nombre,
      codigoInterno: especie.codigoInterno || undefined,
      estadoVinculacion: especie.estadoVinculacion as EspeciePlanificacion['estadoVinculacion'],
      createdAt: especie.createdAt.toISOString(),
      updatedAt: especie.updatedAt.toISOString(),
    })),
    actividadesPlanificacion: actividades.map((actividad) => ({
      id: actividad.id,
      clienteId: actividad.clienteId,
      empresaErpId: actividad.empresaErpId,
      actividadErpId: actividad.actividadErpId || undefined,
      especiePlanificacionId: actividad.especiePlanificacionId || undefined,
      especieErpId: actividad.especieErpId || (actividad.especiePlanificacionId ? especies.find((especie) => especie.id === actividad.especiePlanificacionId)?.especieErpId || undefined : undefined),
      nombre: actividad.nombre,
      codigoInterno: actividad.codigoInterno || undefined,
      estadoVinculacion: actividad.estadoVinculacion as ActividadPlanificacion['estadoVinculacion'],
      createdAt: actividad.createdAt.toISOString(),
      updatedAt: actividad.updatedAt.toISOString(),
    })),
    insumosPlanificacion: insumos.map((insumo) => ({
      id: insumo.id,
      clienteId: insumo.clienteId,
      empresaErpId: insumo.empresaErpId,
      insumoErpId: insumo.insumoErpId || undefined,
      nombre: insumo.nombre,
      codigoInterno: insumo.codigoInterno || undefined,
      tipo: insumo.tipo || undefined,
      unidad: insumo.unidad,
      precioUnitarioEstimado: insumo.precioUnitarioEstimado ?? undefined,
      moneda: insumo.moneda || undefined,
      estadoVinculacion: insumo.estadoVinculacion as InsumoPlanificacion['estadoVinculacion'],
      createdAt: insumo.createdAt.toISOString(),
      updatedAt: insumo.updatedAt.toISOString(),
    })),
    laboresReferencia: labores.map((labor) => ({
      id: labor.id,
      clienteId: labor.clienteId,
      empresaErpId: labor.empresaErpId || undefined,
      servicioErpId: labor.servicioErpId || undefined,
      idServicio: labor.idServicio || undefined,
      idTipoServicio: labor.idTipoServicio || undefined,
      codigo: labor.codigo,
      nombre: labor.nombre,
      descripcionAbreviada: labor.descripcionAbreviada || undefined,
      idUnidadMedida: labor.idUnidadMedida || undefined,
      idMoneda: labor.idMoneda || undefined,
      unidadSugerida: labor.unidadSugerida,
      costoUnitarioSugerido: labor.costoUnitarioSugerido ?? undefined,
      imputaDosis: labor.imputaDosis ?? undefined,
      estadoVinculacion: labor.estadoVinculacion as LaborReferencia['estadoVinculacion'],
      activo: labor.activo,
      origen: labor.origen as LaborReferencia['origen'],
      fechaUltimaActualizacionErp: labor.fechaUltimaActualizacionErp?.toISOString(),
      createdAt: labor.createdAt.toISOString(),
      updatedAt: labor.updatedAt.toISOString(),
    })),
  };
}
