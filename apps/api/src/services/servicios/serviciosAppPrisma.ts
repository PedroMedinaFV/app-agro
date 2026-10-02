import type { GuardarServicioAppRequest, GuardarServicioAppResponse, ServicioApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  prepararServicioApp,
  validarServicioAppBasico,
} from '../planificacion/validacionesPadronesApp';

type ServicioPrisma = Prisma.ServicioAppGetPayload<Record<string, never>>;

function mapearServicio(servicio: ServicioPrisma): ServicioApp {
  return {
    id: servicio.id,
    clienteId: servicio.clienteId,
    empresaErpId: servicio.empresaErpId || undefined,
    servicioErpId: servicio.servicioErpId || undefined,
    idServicio: servicio.idServicio || undefined,
    idTipoServicio: servicio.idTipoServicio || undefined,
    codigo: servicio.codigo,
    nombre: servicio.nombre,
    descripcionAbreviada: servicio.descripcionAbreviada || undefined,
    idUnidadMedida: servicio.idUnidadMedida || undefined,
    idMoneda: servicio.idMoneda || undefined,
    unidadSugerida: servicio.unidadSugerida,
    costoUnitarioSugerido: servicio.costoUnitarioSugerido ?? undefined,
    imputaDosis: servicio.imputaDosis ?? undefined,
    estadoVinculacion: servicio.estadoVinculacion as ServicioApp['estadoVinculacion'],
    activo: servicio.activo,
    origen: servicio.origen as ServicioApp['origen'],
    fechaUltimaActualizacionErp: servicio.fechaUltimaActualizacionErp?.toISOString(),
    createdAt: servicio.createdAt.toISOString(),
    updatedAt: servicio.updatedAt.toISOString(),
  };
}

async function validarServicio(servicio: ServicioApp, usuario?: UsuarioAuditoria) {
  validarServicioAppBasico(servicio, usuario);

  if (servicio.idMoneda !== undefined) {
    const monedasImportadas = await prisma.erpMoneda.count();
    const monedaExiste = monedasImportadas === 0 || await prisma.erpMoneda.findFirst({
      where: {
        idMoneda: servicio.idMoneda,
        activo: true,
      },
    });

    if (!monedaExiste) {
      throw crearErrorValidacion('La moneda seleccionada no existe en el padron importado.');
    }
  }

  if (servicio.servicioErpId) {
    const servicioErp = await prisma.erpServicio.findUnique({ where: { erpId: servicio.servicioErpId } });

    if (!servicioErp) {
      throw crearErrorValidacion('El servicio ERP seleccionado no existe en la cache importada.');
    }

    const servicioYaVinculado = await prisma.servicioApp.findFirst({
      where: {
        clienteId: servicio.clienteId,
        servicioErpId: servicio.servicioErpId,
        id: { not: servicio.id },
      },
    });

    if (servicioYaVinculado) {
      throw crearErrorValidacion('Ese servicio ERP ya esta vinculado a otra labor del cliente.');
    }
  }
}

export async function obtenerServiciosAppPersistidos(clienteId: string): Promise<ServicioApp[]> {
  const servicios = await prisma.servicioApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return servicios.map(mapearServicio);
}

export async function guardarServicioAppPersistido(
  id: string,
  request: GuardarServicioAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarServicioAppResponse> {
  const servicio = prepararServicioApp({ ...request.servicio, id });
  await validarServicio(servicio, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.servicioApp.findUnique({ where: { id } });
    const existenteMismoCodigo = await tx.servicioApp.findUnique({
      where: {
        clienteId_codigo: {
          clienteId: servicio.clienteId,
          codigo: servicio.codigo,
        },
      },
    });

    if (existenteMismoCodigo && existenteMismoCodigo.id !== id) {
      throw crearErrorValidacion('Ya existe una labor con ese codigo.');
    }

    const guardado = await tx.servicioApp.upsert({
      where: { id },
      update: {
        empresaErpId: servicio.empresaErpId ?? null,
        servicioErpId: servicio.servicioErpId ?? null,
        idServicio: servicio.idServicio ?? null,
        idTipoServicio: servicio.idTipoServicio ?? null,
        codigo: servicio.codigo,
        nombre: servicio.nombre,
        descripcionAbreviada: servicio.descripcionAbreviada ?? null,
        idUnidadMedida: servicio.idUnidadMedida ?? null,
        idMoneda: servicio.idMoneda ?? null,
        unidadSugerida: servicio.unidadSugerida,
        costoUnitarioSugerido: servicio.costoUnitarioSugerido ?? null,
        imputaDosis: servicio.imputaDosis ?? null,
        estadoVinculacion: servicio.estadoVinculacion,
        activo: servicio.activo,
        origen: servicio.origen,
        fechaUltimaActualizacionErp: servicio.fechaUltimaActualizacionErp ? new Date(servicio.fechaUltimaActualizacionErp) : null,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: servicio.clienteId,
        empresaErpId: servicio.empresaErpId ?? null,
        servicioErpId: servicio.servicioErpId ?? null,
        idServicio: servicio.idServicio ?? null,
        idTipoServicio: servicio.idTipoServicio ?? null,
        codigo: servicio.codigo,
        nombre: servicio.nombre,
        descripcionAbreviada: servicio.descripcionAbreviada ?? null,
        idUnidadMedida: servicio.idUnidadMedida ?? null,
        idMoneda: servicio.idMoneda ?? null,
        unidadSugerida: servicio.unidadSugerida,
        costoUnitarioSugerido: servicio.costoUnitarioSugerido ?? null,
        imputaDosis: servicio.imputaDosis ?? null,
        estadoVinculacion: servicio.estadoVinculacion,
        activo: servicio.activo,
        origen: servicio.origen,
        fechaUltimaActualizacionErp: servicio.fechaUltimaActualizacionErp ? new Date(servicio.fechaUltimaActualizacionErp) : null,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const servicioMapeado = mapearServicio(guardado);

    await registrarAuditoria(tx, {
      clienteId: servicio.clienteId,
      usuario,
      entidad: 'ServicioApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearServicio(existente) : undefined,
      valoresDespues: servicioMapeado,
    });

    return {
      servicio: servicioMapeado,
      auditado: true,
      mensaje: existente ? 'Labor actualizada con auditoria.' : 'Labor creada con auditoria.',
    };
  });
}
