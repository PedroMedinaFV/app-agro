import type {
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from './auditoria';

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function serializarFecha(fecha?: Date | string | null) {
  if (!fecha) {
    return undefined;
  }

  return fecha instanceof Date ? fecha.toISOString() : fecha;
}

function parsearFecha(fecha?: string) {
  return fecha ? new Date(fecha) : undefined;
}

type PlanificacionPrisma = Prisma.PlanificacionAgricolaGetPayload<{
  include: {
    lineas: {
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

function mapearLinea(linea: PlanificacionPrisma['lineas'][number]): PlanificacionAgricolaLinea {
  return {
    id: linea.id,
    planificacionId: linea.planificacionId,
    empresaErpId: linea.empresaErpId,
    campoPlanificacionId: linea.campoPlanificacionId,
    campoErpId: linea.campoErpId || undefined,
    lotePlanificacionId: linea.lotePlanificacionId,
    loteErpId: linea.loteErpId || undefined,
    actividadPlanificacionId: linea.actividadPlanificacionId,
    actividadErpId: linea.actividadErpId || undefined,
    cultivoErpId: linea.cultivoErpId || undefined,
    destinoReferenciaId: linea.destinoReferenciaId || undefined,
    destinoVenta: linea.destinoVenta,
    destinoVentaManual: linea.destinoVentaManual,
    precioReferenciaId: linea.precioReferenciaId || undefined,
    precioVentaEstimado: linea.precioVentaEstimado,
    precioVentaManual: linea.precioVentaManual,
    hectareasPlanificadas: linea.hectareasPlanificadas,
    rindeEstimado: linea.rindeEstimado,
    gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId || undefined,
    gastosComercialesEstimados: linea.gastosComercialesEstimados,
    protocoloId: linea.protocoloId || undefined,
    ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
    ingresoNetoEstimado: linea.ingresoNetoEstimado,
    costoProduccionEstimado: linea.costoProduccionEstimado,
    margenBrutoEstimado: linea.margenBrutoEstimado,
    margenBrutoActualizado: linea.margenBrutoActualizado ?? undefined,
    estado: linea.estado as PlanificacionAgricolaLinea['estado'],
    createdAt: linea.createdAt.toISOString(),
    updatedAt: linea.updatedAt.toISOString(),
  };
}

function mapearPlanificacion(planificacion: PlanificacionPrisma): PlanificacionAgricola {
  return {
    id: planificacion.id,
    clienteId: planificacion.clienteId,
    campaniaErpId: planificacion.campaniaErpId,
    nombre: planificacion.nombre,
    descripcion: planificacion.descripcion || undefined,
    estado: planificacion.estado as PlanificacionAgricola['estado'],
    cerradaPor: planificacion.cerradaPor || undefined,
    cerradaAt: serializarFecha(planificacion.cerradaAt),
    motivoCierre: planificacion.motivoCierre || undefined,
    lineas: planificacion.lineas.map(mapearLinea),
    createdAt: planificacion.createdAt.toISOString(),
    updatedAt: planificacion.updatedAt.toISOString(),
  };
}

function recalcularLinea(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
  const ingresoBrutoEstimado = linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado;
  const ingresoNetoEstimado = ingresoBrutoEstimado - linea.gastosComercialesEstimados;

  return {
    ...linea,
    ingresoBrutoEstimado,
    ingresoNetoEstimado,
    margenBrutoEstimado: ingresoNetoEstimado - linea.costoProduccionEstimado,
    margenBrutoActualizado: linea.margenBrutoActualizado ?? ingresoNetoEstimado - linea.costoProduccionEstimado,
  };
}

function validarLineas(planificacion: PlanificacionAgricola) {
  const claves = new Set<string>();

  for (const linea of planificacion.lineas) {
    if (!linea.campoPlanificacionId || !linea.lotePlanificacionId || !linea.actividadPlanificacionId) {
      throw crearErrorValidacion('Cada linea debe tener campo, lote y actividad de planificacion.');
    }

    if (linea.hectareasPlanificadas <= 0) {
      throw crearErrorValidacion('Las hectareas planificadas deben ser mayores a cero.');
    }

    if (linea.rindeEstimado < 0 || linea.precioVentaEstimado < 0 || linea.gastosComercialesEstimados < 0 || linea.costoProduccionEstimado < 0) {
      throw crearErrorValidacion('Rinde, precio, gastos y costos no pueden ser negativos.');
    }

    const clave = [
      planificacion.campaniaErpId,
      linea.campoPlanificacionId,
      linea.lotePlanificacionId,
      linea.actividadPlanificacionId,
    ].join('|');

    if (claves.has(clave)) {
      throw crearErrorValidacion('No se puede repetir la misma actividad para una misma campania, campo y lote.');
    }

    claves.add(clave);
  }
}

function validarPlanificacion(planificacion: PlanificacionAgricola) {
  if (!planificacion.clienteId) {
    throw crearErrorValidacion('La planificacion debe tener clienteId.');
  }

  if (!planificacion.campaniaErpId) {
    throw crearErrorValidacion('La planificacion debe tener campaniaErpId.');
  }

  if (planificacion.estado === 'cerrada') {
    throw crearErrorValidacion('El cierre debe ejecutarse por el endpoint especifico de cierre.');
  }

  validarLineas(planificacion);
}

const incluirPlanificacion = {
  lineas: {
    orderBy: { createdAt: 'asc' as const },
  },
};

export async function obtenerPlanificacionesPersistidas(clienteId: string) {
  const registros = await prisma.planificacionAgricola.findMany({
    where: { clienteId },
    include: incluirPlanificacion,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return registros.map(mapearPlanificacion);
}

async function reemplazarLineas(tx: Prisma.TransactionClient, planificacion: PlanificacionAgricola) {
  await tx.planificacionAgricolaLinea.deleteMany({ where: { planificacionId: planificacion.id } });

  for (const lineaOriginal of planificacion.lineas) {
    const linea = recalcularLinea(lineaOriginal);

    await tx.planificacionAgricolaLinea.create({
      data: {
        id: linea.id,
        planificacionId: planificacion.id,
        empresaErpId: linea.empresaErpId,
        campoPlanificacionId: linea.campoPlanificacionId,
        campoErpId: linea.campoErpId,
        lotePlanificacionId: linea.lotePlanificacionId,
        loteErpId: linea.loteErpId,
        actividadPlanificacionId: linea.actividadPlanificacionId,
        actividadErpId: linea.actividadErpId,
        cultivoErpId: linea.cultivoErpId,
        destinoReferenciaId: linea.destinoReferenciaId,
        destinoVenta: linea.destinoVenta,
        destinoVentaManual: linea.destinoVentaManual,
        precioReferenciaId: linea.precioReferenciaId,
        precioVentaEstimado: linea.precioVentaEstimado,
        precioVentaManual: linea.precioVentaManual,
        hectareasPlanificadas: linea.hectareasPlanificadas,
        rindeEstimado: linea.rindeEstimado,
        gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
        gastosComercialesEstimados: linea.gastosComercialesEstimados,
        protocoloId: linea.protocoloId,
        ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
        ingresoNetoEstimado: linea.ingresoNetoEstimado,
        costoProduccionEstimado: linea.costoProduccionEstimado,
        margenBrutoEstimado: linea.margenBrutoEstimado,
        margenBrutoActualizado: linea.margenBrutoActualizado,
        estado: linea.estado,
      },
    });
  }
}

export async function guardarPlanificacionPersistida(
  id: string,
  request: GuardarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarPlanificacionResponse> {
  const planificacion = { ...request.planificacion, id };
  validarPlanificacion(planificacion);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.planificacionAgricola.findUnique({
      where: { id },
      include: incluirPlanificacion,
    });

    if (existente?.estado === 'cerrada') {
      await registrarAuditoria(tx, {
        clienteId: existente.clienteId,
        usuario,
        entidad: 'PlanificacionAgricola',
        entidadId: id,
        accion: 'bloquear_edicion',
        origen: request.origen,
        motivo: request.motivo || 'Intento de modificar planificacion cerrada.',
        valoresAntes: mapearPlanificacion(existente),
      });

      throw crearErrorValidacion('La planificacion esta cerrada y no puede modificarse.', 409);
    }

    await tx.planificacionAgricola.upsert({
      where: { id },
      update: {
        campaniaErpId: planificacion.campaniaErpId,
        nombre: planificacion.nombre,
        descripcion: planificacion.descripcion,
        estado: planificacion.estado,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: planificacion.clienteId,
        campaniaErpId: planificacion.campaniaErpId,
        nombre: planificacion.nombre,
        descripcion: planificacion.descripcion,
        estado: planificacion.estado,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });

    await reemplazarLineas(tx, planificacion);

    const completo = await tx.planificacionAgricola.findUniqueOrThrow({
      where: { id },
      include: incluirPlanificacion,
    });
    const planificacionMapeada = mapearPlanificacion(completo);

    await registrarAuditoria(tx, {
      clienteId: planificacion.clienteId,
      usuario,
      entidad: 'PlanificacionAgricola',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearPlanificacion(existente) : undefined,
      valoresDespues: planificacionMapeada,
    });

    return {
      planificacion: planificacionMapeada,
      auditado: true,
      mensaje: 'Planificacion guardada con auditoria.',
    };
  });
}

export async function cerrarPlanificacionPersistida(
  id: string,
  request: CerrarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<CerrarPlanificacionResponse> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.planificacionAgricola.findUnique({
      where: { id },
      include: incluirPlanificacion,
    });

    if (!existente) {
      throw crearErrorValidacion('No existe la planificacion a cerrar.', 404);
    }

    if (existente.estado === 'cerrada') {
      throw crearErrorValidacion('La planificacion ya esta cerrada.', 409);
    }

    const cerrada = await tx.planificacionAgricola.update({
      where: { id },
      data: {
        estado: 'cerrada',
        cerradaPor: usuario?.id,
        cerradaAt: new Date(),
        motivoCierre: request.motivo,
        updatedBy: usuario?.id,
      },
      include: incluirPlanificacion,
    });
    const planificacionMapeada = mapearPlanificacion(cerrada);

    await registrarAuditoria(tx, {
      clienteId: existente.clienteId,
      usuario,
      entidad: 'PlanificacionAgricola',
      entidadId: id,
      accion: 'cerrar',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: mapearPlanificacion(existente),
      valoresDespues: planificacionMapeada,
    });

    return {
      planificacion: planificacionMapeada,
      auditado: true,
      mensaje: 'Planificacion cerrada y bloqueada para edicion.',
    };
  });
}
