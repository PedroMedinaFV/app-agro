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
    campoAppId: linea.campoAppId,
    campoErpId: linea.campoErpId || undefined,
    loteAppId: linea.loteAppId,
    loteErpId: linea.loteErpId || undefined,
    actividadAppId: linea.actividadAppId,
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
    escenarioOriginal: planificacion.escenarioOriginal,
    escenarioBloqueadoPorId: planificacion.escenarioBloqueadoPorId || undefined,
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

function validarLineas(planificacion: PlanificacionAgricola, opciones: { permitirHectareasCero: boolean }) {
  const claves = new Set<string>();

  for (const linea of planificacion.lineas) {
    if (!linea.campoAppId || !linea.loteAppId || !linea.actividadAppId) {
      throw crearErrorValidacion('Cada linea debe tener campo, lote y actividad de planificacion.');
    }

    if (!Number.isFinite(linea.hectareasPlanificadas) || linea.hectareasPlanificadas < 0) {
      throw crearErrorValidacion('Las hectareas planificadas deben ser mayores o iguales a cero.');
    }

    if (!opciones.permitirHectareasCero && linea.hectareasPlanificadas === 0) {
      throw crearErrorValidacion('Las hectareas planificadas deben ser mayores a cero para cerrar la planificacion.');
    }

    if (
      !Number.isFinite(linea.rindeEstimado)
      || !Number.isFinite(linea.precioVentaEstimado)
      || !Number.isFinite(linea.gastosComercialesEstimados)
      || !Number.isFinite(linea.costoProduccionEstimado)
      || linea.rindeEstimado < 0
      || linea.precioVentaEstimado < 0
      || linea.gastosComercialesEstimados < 0
      || linea.costoProduccionEstimado < 0
    ) {
      throw crearErrorValidacion('Rinde, precio, gastos y costos no pueden ser negativos.');
    }

    const clave = [
      planificacion.campaniaErpId,
      linea.campoAppId,
      linea.loteAppId,
      linea.actividadAppId,
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

  if (planificacion.estado === 'cerrada' || planificacion.estado === 'deshabilitada') {
    throw crearErrorValidacion('El cierre o deshabilitacion debe ejecutarse por el endpoint especifico de cierre.');
  }

  validarLineas(planificacion, { permitirHectareasCero: planificacion.estado === 'borrador' });
}

function validarPlanificacionParaCierre(planificacion: PlanificacionAgricola) {
  if (planificacion.lineas.length === 0) {
    throw crearErrorValidacion('La planificacion debe tener al menos una linea para poder cerrarse.');
  }

  validarLineas(planificacion, { permitirHectareasCero: false });
}

const incluirPlanificacion = {
  lineas: {
    orderBy: { createdAt: 'asc' as const },
  },
};

const TAMANO_BLOQUE_LINEAS = 250;
const TIMEOUT_TRANSACCION_PLANIFICACION_MS = 60000;

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

  const lineas = planificacion.lineas.map((lineaOriginal) => {
    const linea = recalcularLinea(lineaOriginal);

    return {
      id: linea.id,
      planificacionId: planificacion.id,
      empresaErpId: linea.empresaErpId,
      campoAppId: linea.campoAppId,
      campoErpId: linea.campoErpId,
      loteAppId: linea.loteAppId,
      loteErpId: linea.loteErpId,
      actividadAppId: linea.actividadAppId,
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
    };
  });

  for (let inicio = 0; inicio < lineas.length; inicio += TAMANO_BLOQUE_LINEAS) {
    await tx.planificacionAgricolaLinea.createMany({
      data: lineas.slice(inicio, inicio + TAMANO_BLOQUE_LINEAS),
    });
  }
}

function resumirPlanificacionAuditoria(planificacion: PlanificacionAgricola) {
  return {
    id: planificacion.id,
    clienteId: planificacion.clienteId,
    campaniaErpId: planificacion.campaniaErpId,
    nombre: planificacion.nombre,
    estado: planificacion.estado,
    escenarioOriginal: planificacion.escenarioOriginal,
    cantidadLineas: planificacion.lineas.length,
    hectareasPlanificadas: planificacion.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0),
    ingresoNetoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
    costoProduccionEstimado: planificacion.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
    margenBrutoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
    lineasDuplicadasBloqueadas: 0,
  };
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

    if (existente?.estado === 'cerrada' || existente?.estado === 'deshabilitada') {
      await registrarAuditoria(tx, {
        clienteId: existente.clienteId,
        usuario,
        entidad: 'PlanificacionAgricola',
        entidadId: id,
        accion: 'bloquear_edicion',
        origen: request.origen,
        motivo: request.motivo || `Intento de modificar planificacion ${existente.estado}.`,
        valoresAntes: mapearPlanificacion(existente),
      });

      throw crearErrorValidacion('La planificacion esta cerrada o deshabilitada y no puede modificarse.', 409);
    }

    const escenarioOriginalCerrado = await tx.planificacionAgricola.findFirst({
      where: {
        clienteId: planificacion.clienteId,
        campaniaErpId: planificacion.campaniaErpId,
        estado: 'cerrada',
        escenarioOriginal: true,
        id: { not: id },
      },
    });

    if (escenarioOriginalCerrado) {
      throw crearErrorValidacion('La campania ya tiene una planificacion cerrada como escenario original. No se pueden crear ni editar otros escenarios activos.', 409);
    }

    await tx.planificacionAgricola.upsert({
      where: { id },
      update: {
        campaniaErpId: planificacion.campaniaErpId,
        nombre: planificacion.nombre,
        descripcion: planificacion.descripcion,
        estado: planificacion.estado,
        escenarioOriginal: false,
        escenarioBloqueadoPorId: null,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: planificacion.clienteId,
        campaniaErpId: planificacion.campaniaErpId,
        nombre: planificacion.nombre,
        descripcion: planificacion.descripcion,
        estado: planificacion.estado,
        escenarioOriginal: false,
        escenarioBloqueadoPorId: null,
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
      valoresAntes: existente ? resumirPlanificacionAuditoria(mapearPlanificacion(existente)) : undefined,
      valoresDespues: resumirPlanificacionAuditoria(planificacionMapeada),
      metadata: {
        detalle: 'Las lineas se guardan en tabla PlanificacionAgricolaLinea y se audita un resumen para evitar payloads masivos.',
      },
    });

    return {
      planificacion: planificacionMapeada,
      auditado: true,
      mensaje: 'Planificacion guardada con auditoria.',
    };
  }, {
    maxWait: 10000,
    timeout: TIMEOUT_TRANSACCION_PLANIFICACION_MS,
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

    validarPlanificacionParaCierre(mapearPlanificacion(existente));

    const escenariosADeshabilitar = await tx.planificacionAgricola.findMany({
      where: {
        clienteId: existente.clienteId,
        campaniaErpId: existente.campaniaErpId,
        id: { not: id },
        estado: { not: 'deshabilitada' },
      },
      include: incluirPlanificacion,
    });

    await tx.planificacionAgricola.updateMany({
      where: {
        clienteId: existente.clienteId,
        campaniaErpId: existente.campaniaErpId,
        id: { not: id },
        estado: { not: 'deshabilitada' },
      },
      data: {
        estado: 'deshabilitada',
        escenarioOriginal: false,
        escenarioBloqueadoPorId: id,
        updatedBy: usuario?.id,
      },
    });

    const cerrada = await tx.planificacionAgricola.update({
      where: { id },
      data: {
        estado: 'cerrada',
        escenarioOriginal: true,
        escenarioBloqueadoPorId: null,
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

    if (escenariosADeshabilitar.length > 0) {
      await registrarAuditoria(tx, {
        clienteId: existente.clienteId,
        usuario,
        entidad: 'PlanificacionAgricola',
        entidadId: id,
        accion: 'deshabilitar_escenarios_alternativos',
        origen: request.origen,
        motivo: request.motivo || 'Cierre de escenario original de campania.',
        valoresAntes: escenariosADeshabilitar.map(mapearPlanificacion),
        valoresDespues: {
          escenarioOriginalId: id,
          escenariosDeshabilitados: escenariosADeshabilitar.map((escenario) => escenario.id),
        },
      });
    }

    return {
      planificacion: planificacionMapeada,
      auditado: true,
      mensaje: escenariosADeshabilitar.length > 0
        ? `Planificacion cerrada como escenario original. Se deshabilitaron ${escenariosADeshabilitar.length} escenario(s) alternativo(s).`
        : 'Planificacion cerrada como escenario original y bloqueada para edicion.',
    };
  });
}
