import type { CampoApp, GuardarCampoAppRequest, GuardarCampoAppResponse } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  obtenerIdZonaDesdeErpId,
  prepararCampoApp,
  validarCampoAppBasico,
} from '../planificacion/validacionesPadronesApp';

type CampoPrisma = Prisma.CampoAppGetPayload<Record<string, never>>;

function mapearCampo(campo: CampoPrisma): CampoApp {
  return {
    id: campo.id,
    clienteId: campo.clienteId,
    empresaErpId: campo.empresaErpId,
    campoErpId: campo.campoErpId || undefined,
    nombre: campo.nombre,
    codigoInterno: campo.codigoInterno || undefined,
    zonaAppId: campo.zonaAppId || undefined,
    zonaErpId: campo.zonaErpId || undefined,
    estadoVinculacion: campo.estadoVinculacion as CampoApp['estadoVinculacion'],
    createdAt: campo.createdAt.toISOString(),
    updatedAt: campo.updatedAt.toISOString(),
  };
}

async function validarCampo(campo: CampoApp, usuario?: UsuarioAuditoria) {
  validarCampoAppBasico(campo, usuario);

  const zonaApp = campo.zonaAppId
    ? await prisma.zonaApp.findUnique({ where: { id: campo.zonaAppId } })
    : null;

  if (campo.zonaAppId && (!zonaApp || zonaApp.clienteId !== campo.clienteId)) {
    throw crearErrorValidacion('La zona seleccionada no pertenece al cliente.', 403);
  }

  if (campo.zonaAppId && zonaApp?.empresaErpId !== 'global' && zonaApp?.empresaErpId !== campo.empresaErpId) {
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

    const zonaErpIdEsperada = campo.zonaErpId || zonaApp?.zonaErpId;
    const idZonaEsperada = zonaErpIdEsperada ? obtenerIdZonaDesdeErpId(zonaErpIdEsperada) : undefined;

    if (idZonaEsperada && campoErp.idZona && idZonaEsperada !== campoErp.idZona) {
      throw crearErrorValidacion('El campo ERP no pertenece a la zona seleccionada.');
    }

    const campoYaVinculado = await prisma.campoApp.findFirst({
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

export async function obtenerCamposAppPersistidos(clienteId: string): Promise<CampoApp[]> {
  const campos = await prisma.campoApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return campos.map(mapearCampo);
}

export async function guardarCampoAppPersistido(
  id: string,
  request: GuardarCampoAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarCampoAppResponse> {
  const campo = prepararCampoApp({ ...request.campo, id });
  await validarCampo(campo, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.campoApp.findUnique({ where: { id } });
    const existenteMismoCodigo = campo.codigoInterno
      ? await tx.campoApp.findFirst({
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

    const guardado = await tx.campoApp.upsert({
      where: { id },
      update: {
        empresaErpId: campo.empresaErpId,
        campoErpId: campo.campoErpId ?? null,
        nombre: campo.nombre,
        codigoInterno: campo.codigoInterno ?? null,
        zonaAppId: campo.zonaAppId ?? null,
        zonaErpId: campo.zonaErpId ?? null,
        estadoVinculacion: campo.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: campo.clienteId,
        empresaErpId: campo.empresaErpId,
        campoErpId: campo.campoErpId ?? null,
        nombre: campo.nombre,
        codigoInterno: campo.codigoInterno ?? null,
        zonaAppId: campo.zonaAppId ?? null,
        zonaErpId: campo.zonaErpId ?? null,
        estadoVinculacion: campo.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const campoMapeado = mapearCampo(guardado);

    await registrarAuditoria(tx, {
      clienteId: campo.clienteId,
      usuario,
      entidad: 'CampoApp',
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
