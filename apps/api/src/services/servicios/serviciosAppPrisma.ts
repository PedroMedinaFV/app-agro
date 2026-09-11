import type { GuardarServicioAppRequest, GuardarServicioAppResponse, ServicioApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ServicioPrisma = Prisma.ServicioAppGetPayload<Record<string, never>>;

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

function prepararServicio(servicio: ServicioApp): ServicioApp {
  const nombre = limpiarTextoVisible(servicio.nombre);

  return {
    ...servicio,
    empresaErpId: 'global',
    codigo: normalizarCodigo(servicio.codigo || nombre),
    nombre,
    descripcionAbreviada: servicio.descripcionAbreviada ? limpiarTextoVisible(servicio.descripcionAbreviada) : undefined,
    unidadSugerida: limpiarTextoVisible(servicio.unidadSugerida || 'Ha'),
    estadoVinculacion: servicio.servicioErpId ? 'vinculado_erp' : 'provisorio',
    origen: servicio.servicioErpId ? 'erp' : 'provisorio',
  };
}

async function validarServicio(servicio: ServicioApp, usuario?: UsuarioAuditoria) {
  if (!servicio.clienteId) {
    throw crearErrorValidacion('La labor debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== servicio.clienteId) {
    throw crearErrorValidacion('No se puede modificar una labor de otro cliente.', 403);
  }

  if (!servicio.codigo.trim()) {
    throw crearErrorValidacion('La labor debe tener codigo.');
  }

  if (!servicio.nombre.trim()) {
    throw crearErrorValidacion('La labor debe tener nombre.');
  }

  if (!servicio.unidadSugerida.trim()) {
    throw crearErrorValidacion('La labor debe tener unidad sugerida.');
  }

  if (servicio.costoUnitarioSugerido !== undefined && servicio.costoUnitarioSugerido < 0) {
    throw crearErrorValidacion('El costo sugerido no puede ser negativo.');
  }

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
  const servicio = prepararServicio({ ...request.servicio, id });
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
