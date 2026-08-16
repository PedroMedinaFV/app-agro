import type { GuardarInsumoPlanificacionRequest, GuardarInsumoPlanificacionResponse, InsumoPlanificacion } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type InsumoPrisma = Prisma.InsumoPlanificacionGetPayload<Record<string, never>>;

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

function mapearInsumo(insumo: InsumoPrisma): InsumoPlanificacion {
  return {
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
  };
}

function prepararInsumo(insumo: InsumoPlanificacion): InsumoPlanificacion {
  const nombre = limpiarTextoVisible(insumo.nombre);
  const codigoInterno = insumo.codigoInterno ? normalizarCodigo(insumo.codigoInterno) : normalizarCodigo(nombre);

  return {
    ...insumo,
    nombre,
    codigoInterno,
    tipo: insumo.tipo ? limpiarTextoVisible(insumo.tipo) : undefined,
    unidad: limpiarTextoVisible(insumo.unidad || 'Unid'),
    moneda: limpiarTextoVisible(insumo.moneda || 'USD').toUpperCase(),
    estadoVinculacion: insumo.estadoVinculacion || 'provisorio',
  };
}

function validarInsumo(insumo: InsumoPlanificacion, usuario?: UsuarioAuditoria) {
  if (!insumo.clienteId) {
    throw crearErrorValidacion('El insumo debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== insumo.clienteId) {
    throw crearErrorValidacion('No se puede modificar un insumo de otro cliente.', 403);
  }

  if (!insumo.empresaErpId) {
    throw crearErrorValidacion('El insumo debe tener empresaErpId.');
  }

  if (!insumo.nombre.trim()) {
    throw crearErrorValidacion('El insumo debe tener nombre.');
  }

  if (!insumo.unidad.trim()) {
    throw crearErrorValidacion('El insumo debe tener unidad.');
  }

  if (insumo.precioUnitarioEstimado !== undefined && insumo.precioUnitarioEstimado < 0) {
    throw crearErrorValidacion('El precio estimado no puede ser negativo.');
  }
}

export async function obtenerInsumosPlanificacionPersistidos(clienteId: string): Promise<InsumoPlanificacion[]> {
  const insumos = await prisma.insumoPlanificacion.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return insumos.map(mapearInsumo);
}

export async function guardarInsumoPlanificacionPersistido(
  id: string,
  request: GuardarInsumoPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarInsumoPlanificacionResponse> {
  const insumo = prepararInsumo({ ...request.insumo, id });
  validarInsumo(insumo, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.insumoPlanificacion.findUnique({ where: { id } });
    const existenteMismoCodigo = insumo.codigoInterno
      ? await tx.insumoPlanificacion.findFirst({
        where: {
          clienteId: insumo.clienteId,
          codigoInterno: insumo.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe un insumo con ese codigo.');
    }

    const guardado = await tx.insumoPlanificacion.upsert({
      where: { id },
      update: {
        empresaErpId: insumo.empresaErpId,
        insumoErpId: insumo.insumoErpId,
        nombre: insumo.nombre,
        codigoInterno: insumo.codigoInterno,
        tipo: insumo.tipo,
        unidad: insumo.unidad,
        precioUnitarioEstimado: insumo.precioUnitarioEstimado,
        moneda: insumo.moneda,
        estadoVinculacion: insumo.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: insumo.clienteId,
        empresaErpId: insumo.empresaErpId,
        insumoErpId: insumo.insumoErpId,
        nombre: insumo.nombre,
        codigoInterno: insumo.codigoInterno,
        tipo: insumo.tipo,
        unidad: insumo.unidad,
        precioUnitarioEstimado: insumo.precioUnitarioEstimado,
        moneda: insumo.moneda,
        estadoVinculacion: insumo.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const insumoMapeado = mapearInsumo(guardado);

    await registrarAuditoria(tx, {
      clienteId: insumo.clienteId,
      usuario,
      entidad: 'InsumoPlanificacion',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearInsumo(existente) : undefined,
      valoresDespues: insumoMapeado,
    });

    return {
      insumo: insumoMapeado,
      auditado: true,
      mensaje: existente ? 'Insumo actualizado con auditoria.' : 'Insumo creado con auditoria.',
    };
  });
}
