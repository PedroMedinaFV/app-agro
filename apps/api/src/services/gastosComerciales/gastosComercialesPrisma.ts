import type {
  GastoComercialItemReferencia,
  GastosComercialesReferencia,
  GuardarGastosComercialesReferenciaRequest,
  GuardarGastosComercialesReferenciaResponse,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

type GastoPrisma = Prisma.GastosComercialesReferenciaGetPayload<Record<string, never>>;

function mapearItems(valor: Prisma.JsonValue): GastoComercialItemReferencia[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.map((item) => {
    const itemJson = item as Partial<GastoComercialItemReferencia> & { concepto?: string; valor?: number };
    const conceptoNombre = itemJson.conceptoNombre || itemJson.concepto || '';

    return {
      conceptoGastoComercialId: itemJson.conceptoGastoComercialId || '',
      conceptoNombre,
      valorPorTonelada: itemJson.valorPorTonelada ?? itemJson.valor ?? 0,
      moneda: itemJson.moneda || 'USD',
      observaciones: itemJson.observaciones,
    };
  });
}

function mapearGasto(gasto: GastoPrisma): GastosComercialesReferencia {
  return {
    id: gasto.id,
    clienteId: gasto.clienteId,
    campaniaErpId: gasto.campaniaErpId,
    empresaErpId: gasto.empresaErpId,
    zonaPlanificacionId: gasto.zonaPlanificacionId || undefined,
    zonaErpId: gasto.zonaErpId || undefined,
    campoPlanificacionId: gasto.campoPlanificacionId || undefined,
    campoErpId: gasto.campoErpId || undefined,
    actividadPlanificacionId: gasto.actividadPlanificacionId,
    actividadErpId: gasto.actividadErpId || undefined,
    destinoVenta: gasto.destinoVenta || undefined,
    descripcion: gasto.descripcion,
    items: mapearItems(gasto.items),
    activo: gasto.activo,
    createdAt: gasto.createdAt.toISOString(),
    updatedAt: gasto.updatedAt.toISOString(),
  };
}

function validarItem(item: GastoComercialItemReferencia, indice: number) {
  if (!item.conceptoGastoComercialId.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe seleccionar concepto de gasto comercial.`);
  }

  if (!item.conceptoNombre.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe conservar el nombre del concepto.`);
  }

  if (item.valorPorTonelada < 0) {
    throw crearErrorValidacion(`El item ${indice + 1} no puede tener valor por tonelada negativo.`);
  }

  if (!item.moneda.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe tener moneda.`);
  }
}

function validarGasto(gasto: GastosComercialesReferencia) {
  if (!gasto.clienteId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener clienteId.');
  }

  if (!gasto.empresaErpId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener empresaErpId.');
  }

  if (!gasto.campaniaErpId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener campaniaErpId.');
  }

  if (!gasto.actividadPlanificacionId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener actividadPlanificacionId.');
  }

  if (!gasto.descripcion.trim()) {
    throw crearErrorValidacion('Los gastos comerciales deben tener descripcion.');
  }

  if (!gasto.items.length) {
    throw crearErrorValidacion('Los gastos comerciales deben tener al menos un item.');
  }

  gasto.items.forEach(validarItem);
}

function prepararGasto(gasto: GastosComercialesReferencia): GastosComercialesReferencia {
  return {
    ...gasto,
    destinoVenta: gasto.destinoVenta ? limpiarTextoVisible(gasto.destinoVenta) : undefined,
    campaniaErpId: limpiarTextoVisible(gasto.campaniaErpId),
    descripcion: limpiarTextoVisible(gasto.descripcion),
    items: gasto.items.map((item) => ({
      ...item,
      conceptoGastoComercialId: limpiarTextoVisible(item.conceptoGastoComercialId),
      conceptoNombre: limpiarTextoVisible(item.conceptoNombre),
      moneda: limpiarTextoVisible(item.moneda).toUpperCase(),
      observaciones: item.observaciones ? limpiarTextoVisible(item.observaciones) : undefined,
    })),
  };
}

export async function obtenerGastosComercialesPersistidos(clienteId: string): Promise<GastosComercialesReferencia[]> {
  const gastos = await prisma.gastosComercialesReferencia.findMany({
    where: { clienteId },
    orderBy: [{ campaniaErpId: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return gastos.map(mapearGasto);
}

export async function guardarGastoComercialPersistido(
  id: string,
  request: GuardarGastosComercialesReferenciaRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarGastosComercialesReferenciaResponse> {
  const gasto = prepararGasto({ ...request.gasto, id });
  validarGasto(gasto);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.gastosComercialesReferencia.findUnique({ where: { id } });
    const guardado = await tx.gastosComercialesReferencia.upsert({
      where: { id },
      update: {
        empresaErpId: gasto.empresaErpId,
        campaniaErpId: gasto.campaniaErpId,
        zonaPlanificacionId: gasto.zonaPlanificacionId,
        zonaErpId: gasto.zonaErpId,
        campoPlanificacionId: gasto.campoPlanificacionId,
        campoErpId: gasto.campoErpId,
        actividadPlanificacionId: gasto.actividadPlanificacionId,
        actividadErpId: gasto.actividadErpId,
        destinoVenta: gasto.destinoVenta,
        descripcion: gasto.descripcion,
        items: gasto.items as Prisma.InputJsonValue,
        activo: gasto.activo,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: gasto.clienteId,
        campaniaErpId: gasto.campaniaErpId,
        empresaErpId: gasto.empresaErpId,
        zonaPlanificacionId: gasto.zonaPlanificacionId,
        zonaErpId: gasto.zonaErpId,
        campoPlanificacionId: gasto.campoPlanificacionId,
        campoErpId: gasto.campoErpId,
        actividadPlanificacionId: gasto.actividadPlanificacionId,
        actividadErpId: gasto.actividadErpId,
        destinoVenta: gasto.destinoVenta,
        descripcion: gasto.descripcion,
        items: gasto.items as Prisma.InputJsonValue,
        activo: gasto.activo,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const gastoMapeado = mapearGasto(guardado);

    await registrarAuditoria(tx, {
      clienteId: gasto.clienteId,
      usuario,
      entidad: 'GastosComercialesReferencia',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearGasto(existente) : undefined,
      valoresDespues: gastoMapeado,
    });

    return {
      gasto: gastoMapeado,
      auditado: true,
      mensaje: existente ? 'Gastos comerciales actualizados con auditoria.' : 'Gastos comerciales creados con auditoria.',
    };
  });
}
