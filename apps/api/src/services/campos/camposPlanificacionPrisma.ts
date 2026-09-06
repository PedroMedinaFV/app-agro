import type { CampoPlanificacion, GuardarCampoPlanificacionRequest, GuardarCampoPlanificacionResponse } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type CampoPrisma = Prisma.CampoPlanificacionGetPayload<Record<string, never>>;

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

function mapearCampo(campo: CampoPrisma): CampoPlanificacion {
  return {
    id: campo.id,
    clienteId: campo.clienteId,
    empresaErpId: campo.empresaErpId,
    campoErpId: campo.campoErpId || undefined,
    nombre: campo.nombre,
    codigoInterno: campo.codigoInterno || undefined,
    zonaPlanificacionId: campo.zonaPlanificacionId || undefined,
    zonaErpId: campo.zonaErpId || undefined,
    estadoVinculacion: campo.estadoVinculacion as CampoPlanificacion['estadoVinculacion'],
    createdAt: campo.createdAt.toISOString(),
    updatedAt: campo.updatedAt.toISOString(),
  };
}

function prepararCampo(campo: CampoPlanificacion): CampoPlanificacion {
  const nombre = limpiarTextoVisible(campo.nombre);

  return {
    ...campo,
    nombre,
    codigoInterno: campo.codigoInterno ? normalizarCodigo(campo.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: campo.campoErpId ? 'vinculado_erp' : campo.estadoVinculacion || 'provisorio',
  };
}

async function validarCampo(campo: CampoPlanificacion, usuario?: UsuarioAuditoria) {
  if (!campo.clienteId) {
    throw crearErrorValidacion('El campo debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== campo.clienteId) {
    throw crearErrorValidacion('No se puede modificar un campo de otro cliente.', 403);
  }

  if (!campo.empresaErpId) {
    throw crearErrorValidacion('El campo debe tener empresaErpId.');
  }

  if (!campo.nombre.trim()) {
    throw crearErrorValidacion('El campo debe tener nombre.');
  }

  const zonaPlanificacion = campo.zonaPlanificacionId
    ? await prisma.zonaPlanificacion.findUnique({ where: { id: campo.zonaPlanificacionId } })
    : null;

  if (campo.zonaPlanificacionId && (!zonaPlanificacion || zonaPlanificacion.clienteId !== campo.clienteId)) {
    throw crearErrorValidacion('La zona seleccionada no pertenece al cliente.', 403);
  }

  if (campo.zonaPlanificacionId && zonaPlanificacion?.empresaErpId !== 'global' && zonaPlanificacion?.empresaErpId !== campo.empresaErpId) {
    throw crearErrorValidacion('La zona seleccionada no pertenece a la empresa del campo.');
  }

  if (campo.campoErpId) {
    const campoErp = await prisma.erpCampo.findUnique({ where: { erpId: campo.campoErpId } });

    if (!campoErp) {
      throw crearErrorValidacion('El campo ERP seleccionado no existe en la cache importada.');
    }

    if (campoErp.empresaErpId !== campo.empresaErpId) {
      throw crearErrorValidacion('El campo ERP no pertenece a la empresa seleccionada.');
    }

    const zonaErpIdEsperada = campo.zonaErpId || zonaPlanificacion?.zonaErpId;
    const idZonaEsperada = zonaErpIdEsperada ? obtenerIdZonaDesdeErpId(zonaErpIdEsperada) : undefined;

    if (idZonaEsperada && campoErp.idZona && idZonaEsperada !== campoErp.idZona) {
      throw crearErrorValidacion('El campo ERP no pertenece a la zona seleccionada.');
    }

    const campoYaVinculado = await prisma.campoPlanificacion.findFirst({
      where: {
        clienteId: campo.clienteId,
        campoErpId: campo.campoErpId,
        id: { not: campo.id },
      },
    });

    if (campoYaVinculado) {
      throw crearErrorValidacion('Ese campo ERP ya esta vinculado a otro campo del cliente.');
    }
  }
}

function obtenerIdZonaDesdeErpId(zonaErpId: string) {
  const match = zonaErpId.match(/zona:(\d+)$/);

  return match ? Number(match[1]) : undefined;
}

export async function obtenerCamposPlanificacionPersistidos(clienteId: string): Promise<CampoPlanificacion[]> {
  const campos = await prisma.campoPlanificacion.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return campos.map(mapearCampo);
}

export async function guardarCampoPlanificacionPersistido(
  id: string,
  request: GuardarCampoPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarCampoPlanificacionResponse> {
  const campo = prepararCampo({ ...request.campo, id });
  await validarCampo(campo, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.campoPlanificacion.findUnique({ where: { id } });
    const existenteMismoCodigo = campo.codigoInterno
      ? await tx.campoPlanificacion.findFirst({
        where: {
          clienteId: campo.clienteId,
          empresaErpId: campo.empresaErpId,
          codigoInterno: campo.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe un campo con ese codigo para la empresa.');
    }

    const guardado = await tx.campoPlanificacion.upsert({
      where: { id },
      update: {
        empresaErpId: campo.empresaErpId,
        campoErpId: campo.campoErpId,
        nombre: campo.nombre,
        codigoInterno: campo.codigoInterno,
        zonaPlanificacionId: campo.zonaPlanificacionId,
        zonaErpId: campo.zonaErpId,
        estadoVinculacion: campo.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: campo.clienteId,
        empresaErpId: campo.empresaErpId,
        campoErpId: campo.campoErpId,
        nombre: campo.nombre,
        codigoInterno: campo.codigoInterno,
        zonaPlanificacionId: campo.zonaPlanificacionId,
        zonaErpId: campo.zonaErpId,
        estadoVinculacion: campo.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const campoMapeado = mapearCampo(guardado);

    await registrarAuditoria(tx, {
      clienteId: campo.clienteId,
      usuario,
      entidad: 'CampoPlanificacion',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearCampo(existente) : undefined,
      valoresDespues: campoMapeado,
    });

    return {
      campo: campoMapeado,
      auditado: true,
      mensaje: existente ? 'Campo actualizado con auditoria.' : 'Campo creado con auditoria.',
    };
  });
}
