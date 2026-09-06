import type { ActividadPlanificacion, GuardarActividadPlanificacionRequest, GuardarActividadPlanificacionResponse } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ActividadPrisma = Prisma.ActividadPlanificacionGetPayload<Record<string, never>>;

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

function mapearActividad(actividad: ActividadPrisma): ActividadPlanificacion {
  return {
    id: actividad.id,
    clienteId: actividad.clienteId,
    empresaErpId: actividad.empresaErpId,
    actividadErpId: actividad.actividadErpId || undefined,
    especiePlanificacionId: actividad.especiePlanificacionId || undefined,
    especieErpId: actividad.especieErpId || undefined,
    nombre: actividad.nombre,
    codigoInterno: actividad.codigoInterno || undefined,
    estadoVinculacion: actividad.estadoVinculacion as ActividadPlanificacion['estadoVinculacion'],
    createdAt: actividad.createdAt.toISOString(),
    updatedAt: actividad.updatedAt.toISOString(),
  };
}

function prepararActividad(actividad: ActividadPlanificacion): ActividadPlanificacion {
  const nombre = limpiarTextoVisible(actividad.nombre);

  return {
    ...actividad,
    empresaErpId: actividad.empresaErpId || 'global',
    nombre,
    codigoInterno: actividad.codigoInterno ? normalizarCodigo(actividad.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: actividad.actividadErpId ? 'vinculado_erp' : actividad.estadoVinculacion || 'provisorio',
  };
}

async function validarActividad(actividad: ActividadPlanificacion, usuario?: UsuarioAuditoria) {
  if (!actividad.clienteId) {
    throw crearErrorValidacion('La actividad debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== actividad.clienteId) {
    throw crearErrorValidacion('No se puede modificar una actividad de otro cliente.', 403);
  }

  if (!actividad.nombre.trim()) {
    throw crearErrorValidacion('La actividad debe tener nombre.');
  }

  if (!actividad.especiePlanificacionId && !actividad.especieErpId) {
    throw crearErrorValidacion('La actividad debe estar asociada a una especie.');
  }

  const especiePlanificacion = actividad.especiePlanificacionId
    ? await prisma.especiePlanificacion.findUnique({ where: { id: actividad.especiePlanificacionId } })
    : null;

  if (actividad.especiePlanificacionId && (!especiePlanificacion || especiePlanificacion.clienteId !== actividad.clienteId)) {
    throw crearErrorValidacion('La especie seleccionada no pertenece al cliente.', 403);
  }

  if (actividad.actividadErpId) {
    const actividadErp = await prisma.erpActividad.findUnique({ where: { erpId: actividad.actividadErpId } });

    if (!actividadErp) {
      throw crearErrorValidacion('La actividad ERP seleccionada no existe en la cache importada.');
    }

    const especieErpIdEsperada = actividad.especieErpId || especiePlanificacion?.especieErpId;
    const idEspecieEsperada = especieErpIdEsperada ? obtenerIdEspecieDesdeErpId(especieErpIdEsperada) : undefined;

    if (idEspecieEsperada && actividadErp.idEspecie && idEspecieEsperada !== actividadErp.idEspecie) {
      throw crearErrorValidacion('La actividad ERP no pertenece a la especie seleccionada.');
    }

    const actividadYaVinculada = await prisma.actividadPlanificacion.findFirst({
      where: {
        clienteId: actividad.clienteId,
        actividadErpId: actividad.actividadErpId,
        id: { not: actividad.id },
      },
    });

    if (actividadYaVinculada) {
      throw crearErrorValidacion('Esa actividad ERP ya esta vinculada a otra actividad del cliente.');
    }
  }
}

function obtenerIdEspecieDesdeErpId(especieErpId: string) {
  const match = especieErpId.match(/especie:(\d+)$/);

  return match ? Number(match[1]) : undefined;
}

export async function obtenerActividadesPlanificacionPersistidas(clienteId: string): Promise<ActividadPlanificacion[]> {
  const actividades = await prisma.actividadPlanificacion.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return actividades.map(mapearActividad);
}

export async function guardarActividadPlanificacionPersistida(
  id: string,
  request: GuardarActividadPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarActividadPlanificacionResponse> {
  const actividad = prepararActividad({ ...request.actividad, id });
  await validarActividad(actividad, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.actividadPlanificacion.findUnique({ where: { id } });
    const existenteMismoCodigo = actividad.codigoInterno
      ? await tx.actividadPlanificacion.findFirst({
        where: {
          clienteId: actividad.clienteId,
          codigoInterno: actividad.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe una actividad con ese codigo interno.');
    }

    const guardada = await tx.actividadPlanificacion.upsert({
      where: { id },
      update: {
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividad.actividadErpId ?? null,
        especiePlanificacionId: actividad.especiePlanificacionId ?? null,
        especieErpId: actividad.especieErpId ?? null,
        nombre: actividad.nombre,
        codigoInterno: actividad.codigoInterno ?? null,
        estadoVinculacion: actividad.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: actividad.clienteId,
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividad.actividadErpId ?? null,
        especiePlanificacionId: actividad.especiePlanificacionId ?? null,
        especieErpId: actividad.especieErpId ?? null,
        nombre: actividad.nombre,
        codigoInterno: actividad.codigoInterno ?? null,
        estadoVinculacion: actividad.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const actividadMapeada = mapearActividad(guardada);

    await registrarAuditoria(tx, {
      clienteId: actividad.clienteId,
      usuario,
      entidad: 'ActividadPlanificacion',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearActividad(existente) : undefined,
      valoresDespues: actividadMapeada,
    });

    return {
      actividad: actividadMapeada,
      auditado: true,
      mensaje: existente ? 'Actividad actualizada con auditoria.' : 'Actividad creada con auditoria.',
    };
  });
}
