import type { GuardarLaborReferenciaRequest, GuardarLaborReferenciaResponse, LaborReferencia } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type LaborPrisma = Prisma.LaborReferenciaGetPayload<Record<string, never>>;

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function mapearLabor(labor: LaborPrisma): LaborReferencia {
  return {
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
  };
}

function prepararLabor(labor: LaborReferencia): LaborReferencia {
  const nombre = limpiarTextoVisible(labor.nombre);

  return {
    ...labor,
    codigo: normalizarCodigo(labor.codigo || nombre),
    nombre,
    descripcionAbreviada: labor.descripcionAbreviada ? limpiarTextoVisible(labor.descripcionAbreviada) : undefined,
    unidadSugerida: limpiarTextoVisible(labor.unidadSugerida || 'Ha'),
    estadoVinculacion: labor.estadoVinculacion || 'provisorio',
    origen: labor.origen || 'provisorio',
  };
}

function validarLabor(labor: LaborReferencia, usuario?: UsuarioAuditoria) {
  if (!labor.clienteId) {
    throw crearErrorValidacion('La labor debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== labor.clienteId) {
    throw crearErrorValidacion('No se puede modificar una labor de otro cliente.', 403);
  }

  if (!labor.codigo.trim()) {
    throw crearErrorValidacion('La labor debe tener codigo.');
  }

  if (!labor.nombre.trim()) {
    throw crearErrorValidacion('La labor debe tener nombre.');
  }

  if (!labor.unidadSugerida.trim()) {
    throw crearErrorValidacion('La labor debe tener unidad sugerida.');
  }

  if (labor.costoUnitarioSugerido !== undefined && labor.costoUnitarioSugerido < 0) {
    throw crearErrorValidacion('El costo sugerido no puede ser negativo.');
  }
}

export async function obtenerLaboresReferenciaPersistidas(clienteId: string): Promise<LaborReferencia[]> {
  const labores = await prisma.laborReferencia.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return labores.map(mapearLabor);
}

export async function guardarLaborReferenciaPersistida(
  id: string,
  request: GuardarLaborReferenciaRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarLaborReferenciaResponse> {
  const labor = prepararLabor({ ...request.labor, id });
  validarLabor(labor, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.laborReferencia.findUnique({ where: { id } });
    const existenteMismoCodigo = await tx.laborReferencia.findUnique({
      where: {
        clienteId_codigo: {
          clienteId: labor.clienteId,
          codigo: labor.codigo,
        },
      },
    });

    if (existenteMismoCodigo && existenteMismoCodigo.id !== id) {
      throw crearErrorValidacion('Ya existe una labor con ese codigo.');
    }

    const guardado = await tx.laborReferencia.upsert({
      where: { id },
      update: {
        empresaErpId: labor.empresaErpId,
        servicioErpId: labor.servicioErpId,
        idServicio: labor.idServicio,
        idTipoServicio: labor.idTipoServicio,
        codigo: labor.codigo,
        nombre: labor.nombre,
        descripcionAbreviada: labor.descripcionAbreviada,
        idUnidadMedida: labor.idUnidadMedida,
        idMoneda: labor.idMoneda,
        unidadSugerida: labor.unidadSugerida,
        costoUnitarioSugerido: labor.costoUnitarioSugerido,
        imputaDosis: labor.imputaDosis,
        estadoVinculacion: labor.estadoVinculacion,
        activo: labor.activo,
        origen: labor.origen,
        fechaUltimaActualizacionErp: labor.fechaUltimaActualizacionErp ? new Date(labor.fechaUltimaActualizacionErp) : undefined,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: labor.clienteId,
        empresaErpId: labor.empresaErpId,
        servicioErpId: labor.servicioErpId,
        idServicio: labor.idServicio,
        idTipoServicio: labor.idTipoServicio,
        codigo: labor.codigo,
        nombre: labor.nombre,
        descripcionAbreviada: labor.descripcionAbreviada,
        idUnidadMedida: labor.idUnidadMedida,
        idMoneda: labor.idMoneda,
        unidadSugerida: labor.unidadSugerida,
        costoUnitarioSugerido: labor.costoUnitarioSugerido,
        imputaDosis: labor.imputaDosis,
        estadoVinculacion: labor.estadoVinculacion,
        activo: labor.activo,
        origen: labor.origen,
        fechaUltimaActualizacionErp: labor.fechaUltimaActualizacionErp ? new Date(labor.fechaUltimaActualizacionErp) : undefined,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const laborMapeada = mapearLabor(guardado);

    await registrarAuditoria(tx, {
      clienteId: labor.clienteId,
      usuario,
      entidad: 'LaborReferencia',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearLabor(existente) : undefined,
      valoresDespues: laborMapeada,
    });

    return {
      labor: laborMapeada,
      auditado: true,
      mensaje: existente ? 'Labor actualizada con auditoria.' : 'Labor creada con auditoria.',
    };
  });
}
