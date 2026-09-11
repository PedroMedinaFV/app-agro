import type { GuardarZonaAppRequest, GuardarZonaAppResponse, ZonaApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ZonaPrisma = Prisma.ZonaAppGetPayload<Record<string, never>>;

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

function mapearZona(zona: ZonaPrisma): ZonaApp {
  return {
    id: zona.id,
    clienteId: zona.clienteId,
    empresaErpId: zona.empresaErpId,
    zonaErpId: zona.zonaErpId || undefined,
    nombre: zona.nombre,
    codigoInterno: zona.codigoInterno || undefined,
    estadoVinculacion: zona.estadoVinculacion as ZonaApp['estadoVinculacion'],
    createdAt: zona.createdAt.toISOString(),
    updatedAt: zona.updatedAt.toISOString(),
  };
}

function prepararZona(zona: ZonaApp): ZonaApp {
  const nombre = limpiarTextoVisible(zona.nombre);

  return {
    ...zona,
    empresaErpId: 'global',
    nombre,
    codigoInterno: zona.codigoInterno ? normalizarCodigo(zona.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: zona.zonaErpId ? 'vinculado_erp' : 'provisorio',
  };
}

async function validarZona(zona: ZonaApp, usuario?: UsuarioAuditoria) {
  if (!zona.clienteId) {
    throw crearErrorValidacion('La zona debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== zona.clienteId) {
    throw crearErrorValidacion('No se puede modificar una zona de otro cliente.', 403);
  }

  if (!zona.nombre.trim()) {
    throw crearErrorValidacion('La zona debe tener nombre.');
  }

  if (!['provisorio', 'vinculado_erp'].includes(zona.estadoVinculacion)) {
    throw crearErrorValidacion('El estado de vinculacion de la zona no es valido.');
  }

  if (zona.zonaErpId) {
    const zonaErp = await prisma.erpZona.findUnique({ where: { erpId: zona.zonaErpId } });

    if (!zonaErp) {
      throw crearErrorValidacion('La zona ERP seleccionada no existe en la cache importada.');
    }

    const zonaYaVinculada = await prisma.zonaApp.findFirst({
      where: {
        clienteId: zona.clienteId,
        zonaErpId: zona.zonaErpId,
        id: { not: zona.id },
      },
    });

    if (zonaYaVinculada) {
      throw crearErrorValidacion('Esa zona ERP ya esta vinculada a otra zona del cliente.');
    }
  }
}

export async function obtenerZonasAppPersistidas(clienteId: string): Promise<ZonaApp[]> {
  const zonas = await prisma.zonaApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return zonas.map(mapearZona);
}

export async function guardarZonaAppPersistida(
  id: string,
  request: GuardarZonaAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarZonaAppResponse> {
  const zona = prepararZona({ ...request.zona, id });
  await validarZona(zona, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.zonaApp.findUnique({ where: { id } });
    const existenteMismoCodigo = zona.codigoInterno
      ? await tx.zonaApp.findFirst({
        where: {
          clienteId: zona.clienteId,
          codigoInterno: zona.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe una zona con ese codigo interno.');
    }

    const guardada = await tx.zonaApp.upsert({
      where: { id },
      update: {
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId ?? null,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno ?? null,
        estadoVinculacion: zona.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: zona.clienteId,
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId ?? null,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno ?? null,
        estadoVinculacion: zona.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const zonaMapeada = mapearZona(guardada);

    await registrarAuditoria(tx, {
      clienteId: zona.clienteId,
      usuario,
      entidad: 'ZonaApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearZona(existente) : undefined,
      valoresDespues: zonaMapeada,
    });

    return {
      zona: zonaMapeada,
      auditado: true,
      mensaje: existente ? 'Zona actualizada con auditoria.' : 'Zona creada con auditoria.',
    };
  });
}
