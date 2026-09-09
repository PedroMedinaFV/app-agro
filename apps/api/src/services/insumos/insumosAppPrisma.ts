import type { GuardarInsumoAppRequest, GuardarInsumoAppResponse, InsumoApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type InsumoPrisma = Prisma.InsumoAppGetPayload<Record<string, never>>;

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

function mapearInsumo(insumo: InsumoPrisma): InsumoApp {
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
    estadoVinculacion: insumo.estadoVinculacion as InsumoApp['estadoVinculacion'],
    createdAt: insumo.createdAt.toISOString(),
    updatedAt: insumo.updatedAt.toISOString(),
  };
}

function prepararInsumo(insumo: InsumoApp): InsumoApp {
  const nombre = limpiarTextoVisible(insumo.nombre);
  const codigoInterno = insumo.codigoInterno ? normalizarCodigo(insumo.codigoInterno) : normalizarCodigo(nombre);

  return {
    ...insumo,
    nombre,
    codigoInterno,
    tipo: insumo.tipo ? limpiarTextoVisible(insumo.tipo) : undefined,
    unidad: limpiarTextoVisible(insumo.unidad || 'Unid'),
    moneda: limpiarTextoVisible(insumo.moneda || 'USD').toUpperCase(),
    estadoVinculacion: insumo.insumoErpId ? 'vinculado_erp' : insumo.estadoVinculacion || 'provisorio',
  };
}

async function validarInsumo(insumo: InsumoApp, usuario?: UsuarioAuditoria) {
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

  if (insumo.insumoErpId) {
    const insumoErp = await prisma.erpInsumo.findUnique({ where: { erpId: insumo.insumoErpId } });

    if (!insumoErp) {
      throw crearErrorValidacion('El insumo ERP seleccionado no existe en la cache importada.');
    }

    const insumoYaVinculado = await prisma.insumoApp.findFirst({
      where: {
        clienteId: insumo.clienteId,
        insumoErpId: insumo.insumoErpId,
        id: { not: insumo.id },
      },
    });

    if (insumoYaVinculado) {
      throw crearErrorValidacion('Ese insumo ERP ya esta vinculado a otro insumo del cliente.');
    }
  }
}

export async function obtenerInsumosAppPersistidos(clienteId: string): Promise<InsumoApp[]> {
  const insumos = await prisma.insumoApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return insumos.map(mapearInsumo);
}

export async function guardarInsumoAppPersistido(
  id: string,
  request: GuardarInsumoAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarInsumoAppResponse> {
  const insumo = prepararInsumo({ ...request.insumo, id });
  await validarInsumo(insumo, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.insumoApp.findUnique({ where: { id } });
    const existenteMismoCodigo = insumo.codigoInterno
      ? await tx.insumoApp.findFirst({
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

    const guardado = await tx.insumoApp.upsert({
      where: { id },
      update: {
        empresaErpId: insumo.empresaErpId,
        insumoErpId: insumo.insumoErpId ?? null,
        nombre: insumo.nombre,
        codigoInterno: insumo.codigoInterno ?? null,
        tipo: insumo.tipo ?? null,
        unidad: insumo.unidad,
        precioUnitarioEstimado: insumo.precioUnitarioEstimado ?? null,
        moneda: insumo.moneda ?? null,
        estadoVinculacion: insumo.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: insumo.clienteId,
        empresaErpId: insumo.empresaErpId,
        insumoErpId: insumo.insumoErpId ?? null,
        nombre: insumo.nombre,
        codigoInterno: insumo.codigoInterno ?? null,
        tipo: insumo.tipo ?? null,
        unidad: insumo.unidad,
        precioUnitarioEstimado: insumo.precioUnitarioEstimado ?? null,
        moneda: insumo.moneda ?? null,
        estadoVinculacion: insumo.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const insumoMapeado = mapearInsumo(guardado);

    await registrarAuditoria(tx, {
      clienteId: insumo.clienteId,
      usuario,
      entidad: 'InsumoApp',
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
