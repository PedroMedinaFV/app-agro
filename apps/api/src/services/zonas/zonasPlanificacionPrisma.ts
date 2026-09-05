import type { GuardarZonaPlanificacionRequest, GuardarZonaPlanificacionResponse, ZonaPlanificacion } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ZonaPrisma = Prisma.ZonaPlanificacionGetPayload<Record<string, never>>;

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

function mapearZona(zona: ZonaPrisma): ZonaPlanificacion {
  return {
    id: zona.id,
    clienteId: zona.clienteId,
    empresaErpId: zona.empresaErpId,
    zonaErpId: zona.zonaErpId || undefined,
    nombre: zona.nombre,
    codigoInterno: zona.codigoInterno || undefined,
    estadoVinculacion: zona.estadoVinculacion as ZonaPlanificacion['estadoVinculacion'],
    createdAt: zona.createdAt.toISOString(),
    updatedAt: zona.updatedAt.toISOString(),
  };
}

function prepararZona(zona: ZonaPlanificacion): ZonaPlanificacion {
  const nombre = limpiarTextoVisible(zona.nombre);

  return {
    ...zona,
    empresaErpId: zona.empresaErpId || 'global',
    nombre,
    codigoInterno: zona.codigoInterno ? normalizarCodigo(zona.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: zona.zonaErpId ? 'vinculado_erp' : zona.estadoVinculacion || 'provisorio',
  };
}

function validarZona(zona: ZonaPlanificacion, usuario?: UsuarioAuditoria) {
  if (!zona.clienteId) {
    throw crearErrorValidacion('La zona debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== zona.clienteId) {
    throw crearErrorValidacion('No se puede modificar una zona de otro cliente.', 403);
  }

  if (!zona.nombre.trim()) {
    throw crearErrorValidacion('La zona debe tener nombre.');
  }

  if (!['provisorio', 'vinculado_erp', 'archivado'].includes(zona.estadoVinculacion)) {
    throw crearErrorValidacion('El estado de vinculacion de la zona no es valido.');
  }
}

export async function obtenerZonasPlanificacionPersistidas(clienteId: string): Promise<ZonaPlanificacion[]> {
  const zonas = await prisma.zonaPlanificacion.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return zonas.map(mapearZona);
}

export async function guardarZonaPlanificacionPersistida(
  id: string,
  request: GuardarZonaPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarZonaPlanificacionResponse> {
  const zona = prepararZona({ ...request.zona, id });
  validarZona(zona, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.zonaPlanificacion.findUnique({ where: { id } });
    const existenteMismoCodigo = zona.codigoInterno
      ? await tx.zonaPlanificacion.findFirst({
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

    const guardada = await tx.zonaPlanificacion.upsert({
      where: { id },
      update: {
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno,
        estadoVinculacion: zona.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: zona.clienteId,
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno,
        estadoVinculacion: zona.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const zonaMapeada = mapearZona(guardada);

    await registrarAuditoria(tx, {
      clienteId: zona.clienteId,
      usuario,
      entidad: 'ZonaPlanificacion',
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
