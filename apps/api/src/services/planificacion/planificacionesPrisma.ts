import { bloquearPadronesCliente } from './consolidarCopiaErp';
import { guardarAlcance, normalizarAlcanceDocumento, lotesDelDocumento, validarDisponibilidadAlcance, validarIntegridadCierre, validarPoliticaDocumento } from './politicaDocumentosPlanificacion';
import type {
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  PlanificacionAgricola,
  PlanificacionAgricolaResumen,
} from '@agro/tipos';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { reemplazarLineas } from './lineasPlanificacionPrisma';
import {
  serializarFecha,
  serializarGastosComercialesSnapshot,
  serializarPadronesSnapshot,
  serializarDestinoVentaSnapshot,
  serializarPrecioVentaSnapshot,
  serializarProtocoloSnapshot,
  mapearCampoApp,
  mapearLoteApp,
  mapearActividadApp,
  mapearCultivoErp,
  mapearDestinoReferencia,
  mapearPrecioReferencia,
  mapearGastoComercialReferencia,
  mapearPlanificacion,
} from './serializacionPlanificacion';
import { obtenerClienteSesion, validarClienteSesion } from '../seguridad/alcanceCliente';
import { validarAlcanceLineasPlanificacion } from './alcancePlanificacion';
import { registrarAuditoria, UsuarioAuditoria } from './auditoria';
import { obtenerProtocolosDetallePorIds } from './protocolosPrisma';
import {
  crearErrorValidacion,
  congelarPlanificacionParaCierre,
  LoteSuperficieValidacion,
  validarCabeceraPlanificacion,
  validarLineasPlanificacion,
  validarPlanificacionTieneLineasParaCierre,
} from './validacionesPlanificacion';

async function obtenerLotesSuperficieValidacion(
  planificacion: PlanificacionAgricola,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const loteIds = Array.from(new Set(planificacion.lineas.map((linea) => linea.loteAppId).filter(Boolean)));

  if (loteIds.length === 0) {
    return new Map<string, LoteSuperficieValidacion>();
  }

  const lotes = await client.loteApp.findMany({
    where: {
      id: { in: loteIds },
      clienteId: planificacion.clienteId,
    },
    select: {
      id: true,
      nombre: true,
      superficieTotal: true,
    },
  });

  return new Map(lotes.map((lote) => [lote.id, lote]));
}

async function validarPlanificacion(planificacion: PlanificacionAgricola) {
  validarCabeceraPlanificacion(planificacion);
  validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: planificacion.estado === 'borrador',
    lotesPorId: await obtenerLotesSuperficieValidacion(planificacion),
  });
}

async function validarPlanificacionParaCierre(planificacion: PlanificacionAgricola, tx: Prisma.TransactionClient) {
  validarPlanificacionTieneLineasParaCierre(planificacion);
  validarIntegridadCierre(planificacion);
  validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: false,
    lotesPorId: await obtenerLotesSuperficieValidacion(planificacion, tx),
  });
}

const incluirPlanificacion = {
  alcance: true,
  lineas: {
    orderBy: { createdAt: 'asc' as const },
  },
};

const TIMEOUT_TRANSACCION_PLANIFICACION_MS = 60000;

export async function obtenerPlanificacionesPersistidas(clienteId: string) {
  const registros = await prisma.planificacionAgricola.findMany({
    where: { clienteId },
    include: incluirPlanificacion,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return registros.map(mapearPlanificacion);
}

export async function obtenerPlanificacionPersistida(clienteId: string, planificacionId: string) {
  const registro = await prisma.planificacionAgricola.findFirst({
    where: {
      id: planificacionId,
      clienteId,
    },
    include: incluirPlanificacion,
  });

  return registro ? mapearPlanificacion(registro) : null;
}

export async function obtenerPlanificacionesResumenPersistidas(clienteId: string): Promise<PlanificacionAgricolaResumen[]> {
  const registros = await prisma.planificacionAgricola.findMany({
    where: { clienteId },
    select: {
      id: true,
      clienteId: true,
      campaniaErpId: true,
      nombre: true,
      descripcion: true,
      estado: true,
      escenarioOriginal: true,
      tipoDocumento: true, planificacionOriginalId: true, numeroAnexo: true, motivoIncorporacion: true, fechaIncorporacion: true,
      alcance: true,
      escenarioBloqueadoPorId: true,
      cerradaPor: true,
      cerradaAt: true,
      motivoCierre: true,
      createdAt: true,
      updatedAt: true,
      lineas: {
        select: {
          campoAppId: true,
          loteAppId: true,
          actividadAppId: true,
          protocoloId: true,
          hectareasPlanificadas: true,
          ingresoNetoEstimado: true,
          costoProduccionEstimado: true,
          margenBrutoEstimado: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return registros.map((planificacion) => {
    const claves = new Set<string>();
    let tieneLineasDuplicadas = false;

    for (const linea of planificacion.lineas) {
      const clave = `${planificacion.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;

      if (claves.has(clave)) {
        tieneLineasDuplicadas = true;
        break;
      }

      claves.add(clave);
    }

    return {
      id: planificacion.id,
      clienteId: planificacion.clienteId,
      campaniaErpId: planificacion.campaniaErpId,
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion || undefined,
      estado: planificacion.estado as PlanificacionAgricola['estado'],
      escenarioOriginal: planificacion.escenarioOriginal,
      tipoDocumento: planificacion.tipoDocumento as PlanificacionAgricola['tipoDocumento'],
      planificacionOriginalId: planificacion.planificacionOriginalId ?? undefined, numeroAnexo: planificacion.numeroAnexo ?? undefined,
      motivoIncorporacion: planificacion.motivoIncorporacion ?? undefined, fechaIncorporacion: planificacion.fechaIncorporacion?.toISOString().slice(0, 10),
      alcanceLoteIds: planificacion.alcance.map((a) => a.loteAppId),
      escenarioBloqueadoPorId: planificacion.escenarioBloqueadoPorId || undefined,
      cerradaPor: planificacion.cerradaPor || undefined,
      cerradaAt: serializarFecha(planificacion.cerradaAt),
      motivoCierre: planificacion.motivoCierre || undefined,
      cantidadLineas: planificacion.lineas.length,
      hectareasPlanificadas: planificacion.lineas.reduce((total, linea) => total + (linea.protocoloId ? linea.hectareasPlanificadas : 0), 0),
      ingresoNetoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
      costoProduccionEstimado: planificacion.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
      margenBrutoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
      tieneLineasDuplicadas,
      createdAt: planificacion.createdAt.toISOString(),
      updatedAt: planificacion.updatedAt.toISOString(),
    };
  });
}

function resumirPlanificacionAuditoria(planificacion: PlanificacionAgricola) {
  return {
    tipoDocumento: planificacion.tipoDocumento,
    planificacionOriginalId: planificacion.planificacionOriginalId,
    numeroAnexo: planificacion.numeroAnexo,
    motivoIncorporacion: planificacion.motivoIncorporacion,
    fechaIncorporacion: planificacion.fechaIncorporacion,
    alcanceLoteIds: lotesDelDocumento(planificacion),
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
  validarClienteSesion(planificacion.clienteId, usuario);
  await validarPlanificacion(planificacion);

  try {
    return await prisma.$transaction((tx) => guardarPlanificacionEnTransaccion(tx, id, request, usuario), {
      maxWait: 10000,
      timeout: TIMEOUT_TRANSACCION_PLANIFICACION_MS,
    });
  } catch (error) {
    // La auditoria de un rechazo debe persistir fuera de la transaccion revertida.
    if ((error as { statusCode?: number }).statusCode === 409) {
      const bloqueada = await prisma.planificacionAgricola.findFirst({ where: { id, clienteId: planificacion.clienteId, estado: { in: ['cerrada', 'deshabilitada'] } } });
      if (bloqueada) await registrarAuditoria(prisma, { clienteId: bloqueada.clienteId, usuario, entidad: 'PlanificacionAgricola', entidadId: id,
        accion: 'bloquear_edicion', origen: request.origen, motivo: 'Intento de modificar documento bloqueado; transaccion revertida.',
        valoresAntes: { estado: bloqueada.estado, tipoDocumento: bloqueada.tipoDocumento, planificacionOriginalId: bloqueada.planificacionOriginalId },
      });
    }
    throw error;
  }
}

export async function guardarPlanificacionEnTransaccion(
  tx: Prisma.TransactionClient,
  id: string,
  request: GuardarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
  opciones: { crearAnexo?: boolean } = {},
): Promise<GuardarPlanificacionResponse> {
  const planificacion = { ...request.planificacion, id };
  validarClienteSesion(planificacion.clienteId, usuario);
  await bloquearPadronesCliente(tx, planificacion.clienteId);
  const existente = await tx.planificacionAgricola.findUnique({
    where: { id },
    include: incluirPlanificacion,
  });

  if (existente) validarClienteSesion(existente.clienteId, usuario);
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

  await normalizarAlcanceDocumento(tx, planificacion);
  await validarPoliticaDocumento(tx, planificacion, existente ? mapearPlanificacion(existente) : null, opciones.crearAnexo);
  await validarDisponibilidadAlcance(tx, planificacion);
  const escenarioOriginalCerrado = await tx.planificacionAgricola.findFirst({
    where: {
      clienteId: planificacion.clienteId,
      campaniaErpId: planificacion.campaniaErpId,
      estado: 'cerrada',
      escenarioOriginal: true,
      id: { not: id },
    },
  });

  if (escenarioOriginalCerrado && planificacion.tipoDocumento !== 'anexo') {
    throw crearErrorValidacion('La campania ya tiene una planificacion cerrada como escenario original. No se pueden crear ni editar otros escenarios activos.', 409);
  }

  await validarAlcanceLineasPlanificacion(tx, planificacion);
  await tx.planificacionAgricola.upsert({
    where: { id },
    update: {
      campaniaErpId: planificacion.campaniaErpId,
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion,
      estado: planificacion.estado,
      tipoDocumento: planificacion.tipoDocumento ?? 'base',
      planificacionOriginalId: planificacion.planificacionOriginalId ?? null,
      motivoIncorporacion: planificacion.motivoIncorporacion?.trim() ?? null,
      fechaIncorporacion: planificacion.fechaIncorporacion ? new Date(planificacion.fechaIncorporacion) : null,
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
      tipoDocumento: planificacion.tipoDocumento ?? 'base',
      planificacionOriginalId: planificacion.planificacionOriginalId ?? null,
      motivoIncorporacion: planificacion.motivoIncorporacion?.trim() ?? null,
      fechaIncorporacion: planificacion.fechaIncorporacion ? new Date(planificacion.fechaIncorporacion) : null,
      escenarioOriginal: false,
      escenarioBloqueadoPorId: null,
      createdBy: usuario?.id,
      updatedBy: usuario?.id,
    },
  });

  await reemplazarLineas(tx, planificacion);
  await guardarAlcance(tx, planificacion);

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
}

export async function cerrarPlanificacionPersistida(
  id: string,
  request: CerrarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<CerrarPlanificacionResponse> {
  return prisma.$transaction((tx) => cerrarPlanificacionEnTransaccion(tx, id, request, usuario), {
    maxWait: 10000,
    timeout: TIMEOUT_TRANSACCION_PLANIFICACION_MS,
  });
}

export async function cerrarPlanificacionEnTransaccion(
  tx: Prisma.TransactionClient,
  id: string,
  request: CerrarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<CerrarPlanificacionResponse> {
  obtenerClienteSesion(usuario);
  const existente = await tx.planificacionAgricola.findUnique({
    where: { id },
    include: incluirPlanificacion,
  });

  if (!existente) {
    throw crearErrorValidacion('No existe la planificacion a cerrar.', 404);
  }

  validarClienteSesion(existente.clienteId, usuario);
  if (existente.estado === 'cerrada') {
    throw crearErrorValidacion('La planificacion ya esta cerrada.', 409);
  }

  if (existente.estado === 'deshabilitada') throw crearErrorValidacion('La planificacion esta deshabilitada.', 409);
  await bloquearPadronesCliente(tx, existente.clienteId);
  // Volver a leer despues del lock: evita cierres con datos leidos antes de otro guardado/cierre.
  const vigente = await tx.planificacionAgricola.findUniqueOrThrow({ where: { id }, include: incluirPlanificacion });
  if (vigente.estado === 'cerrada' || vigente.estado === 'deshabilitada') throw crearErrorValidacion('El documento ya no admite cierre.', 409);
  const planificacionExistente = mapearPlanificacion(vigente);
  await validarPoliticaDocumento(tx, planificacionExistente, planificacionExistente);
  await validarDisponibilidadAlcance(tx, planificacionExistente);
  await validarAlcanceLineasPlanificacion(tx, planificacionExistente);
  await validarPlanificacionParaCierre(planificacionExistente, tx);
  const campoIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.campoAppId).filter(Boolean)));
  const loteIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.loteAppId).filter(Boolean)));
  const actividadIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.actividadAppId).filter(Boolean)));
  const cultivoErpIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.cultivoErpId)
    .filter((cultivoErpId): cultivoErpId is string => Boolean(cultivoErpId))));
  const gastosReferenciaIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.gastosComercialesReferenciaId)
    .filter((id): id is string => Boolean(id))));
  const [campos, lotes, actividades, cultivosErp, gastosReferencias] = await Promise.all([
    campoIds.length ? tx.campoApp.findMany({ where: { id: { in: campoIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    loteIds.length ? tx.loteApp.findMany({ where: { id: { in: loteIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    actividadIds.length ? tx.actividadApp.findMany({ where: { id: { in: actividadIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    cultivoErpIds.length ? tx.erpCultivo.findMany({ where: { erpId: { in: cultivoErpIds } } }) : Promise.resolve([]),
    gastosReferenciaIds.length ? tx.gastoComercialApp.findMany({ where: { id: { in: gastosReferenciaIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
  ]);
  const camposPorId = new Map(campos.map((campo) => [campo.id, mapearCampoApp(campo)]));
  const lotesPorId = new Map(lotes.map((lote) => [lote.id, mapearLoteApp(lote)]));
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, mapearActividadApp(actividad)]));
  const cultivosPorErpId = new Map(cultivosErp.map((cultivo) => [cultivo.erpId, mapearCultivoErp(cultivo)]));
  const gastosComercialesPorId = new Map(gastosReferencias.map((gasto) => [gasto.id, mapearGastoComercialReferencia(gasto)]));
  const protocoloIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.protocoloId)
    .filter((protocoloId): protocoloId is string => Boolean(protocoloId))));
  const protocolosDetalle = await obtenerProtocolosDetallePorIds(existente.clienteId, protocoloIds, tx);
  const protocolosPorId = new Map(protocolosDetalle.map((protocolo) => [protocolo.id, protocolo]));
  for (const linea of planificacionExistente.lineas) {
    const protocolo = protocolosPorId.get(linea.protocoloId!);
    const campo = camposPorId.get(linea.campoAppId);
    if (!protocolo || protocolo.campaniaErpId !== vigente.campaniaErpId || protocolo.actividadAppId !== linea.actividadAppId
      || (protocolo.campoAppId && protocolo.campoAppId !== linea.campoAppId)
      || (protocolo.zonaAppId && protocolo.zonaAppId !== campo?.zonaAppId)) {
      throw crearErrorValidacion(`El protocolo de la linea ${linea.id}, lote ${linea.loteAppId}, debe ser compatible con actividad, campo/zona y campania.`, 409);
    }
  }
  const destinoIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.destinoReferenciaId)
    .filter((destinoId): destinoId is string => typeof destinoId === 'string' && !destinoId.startsWith('puerto-'))));
  const precioIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.precioReferenciaId)
    .filter((precioId): precioId is string => Boolean(precioId))));
  const [destinosReferencia, preciosReferencia] = await Promise.all([
    destinoIds.length ? tx.destinoApp.findMany({ where: { id: { in: destinoIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    precioIds.length ? tx.precioApp.findMany({ where: { id: { in: precioIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
  ]);
  const destinosPorId = new Map(destinosReferencia.map((destino) => [destino.id, mapearDestinoReferencia(destino)]));
  const preciosPorId = new Map(preciosReferencia.map((precio) => [precio.id, mapearPrecioReferencia(precio)]));
  const planificacionCongelada = congelarPlanificacionParaCierre(planificacionExistente, gastosComercialesPorId, protocolosPorId, {
    camposPorId,
    lotesPorId,
    actividadesPorId,
    cultivosPorErpId,
    destinosPorId,
    preciosPorId,
  });

  const esAnexo = vigente.tipoDocumento === 'anexo';
  const escenariosADeshabilitar = esAnexo ? [] : await tx.planificacionAgricola.findMany({
    where: {
      clienteId: existente.clienteId,
      campaniaErpId: existente.campaniaErpId,
      id: { not: id },
      tipoDocumento: 'base',
      estado: { notIn: ['deshabilitada', 'cerrada'] },
    },
    include: incluirPlanificacion,
  });

  if (!esAnexo) await tx.planificacionAgricola.updateMany({
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

  for (const linea of planificacionCongelada.lineas) {
    await tx.planificacionAgricolaLinea.update({
      where: { id: linea.id },
      data: {
        empresaErpId: linea.empresaErpId,
        campoAppId: linea.campoAppId,
        campoErpId: linea.campoErpId,
        loteAppId: linea.loteAppId,
        loteErpId: linea.loteErpId,
        actividadAppId: linea.actividadAppId,
        actividadErpId: linea.actividadErpId,
        cultivoErpId: linea.cultivoErpId,
        padronesSnapshot: serializarPadronesSnapshot(linea.padronesSnapshot),
        destinoReferenciaId: linea.destinoReferenciaId,
        destinoVenta: linea.destinoVenta,
        destinoVentaManual: linea.destinoVentaManual,
        destinoVentaSnapshot: serializarDestinoVentaSnapshot(linea.destinoVentaSnapshot),
        precioReferenciaId: linea.precioReferenciaId,
        precioVentaEstimado: linea.precioVentaEstimado,
        precioVentaManual: linea.precioVentaManual,
        precioVentaSnapshot: serializarPrecioVentaSnapshot(linea.precioVentaSnapshot),
        hectareasPlanificadas: linea.hectareasPlanificadas,
        rindeEstimado: linea.rindeEstimado,
        gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
        gastosComercialesEstimados: linea.gastosComercialesEstimados,
        gastosComercialesSnapshot: serializarGastosComercialesSnapshot(linea.gastosComercialesSnapshot),
        protocoloId: linea.protocoloId,
        protocoloSnapshot: serializarProtocoloSnapshot(linea.protocoloSnapshot),
        ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
        ingresoNetoEstimado: linea.ingresoNetoEstimado,
        costoProduccionEstimado: linea.costoProduccionEstimado,
        margenBrutoEstimado: linea.margenBrutoEstimado,
        margenBrutoActualizado: linea.margenBrutoActualizado,
        estado: linea.estado,
      },
    });
  }

  const ultimoAnexo = esAnexo ? await tx.planificacionAgricola.aggregate({
    where: { planificacionOriginalId: vigente.planificacionOriginalId }, _max: { numeroAnexo: true },
  }) : null;
  await tx.planificacionLoteAprobado.createMany({ data: lotesDelDocumento(planificacionExistente).map((loteAppId) => ({
    clienteId: vigente.clienteId, campaniaErpId: vigente.campaniaErpId, loteAppId, planificacionId: id,
  })) });
  const cerrada = await tx.planificacionAgricola.update({
    where: { id },
    data: {
      estado: 'cerrada',
      escenarioOriginal: !esAnexo,
      numeroAnexo: esAnexo ? (ultimoAnexo?._max.numeroAnexo ?? 0) + 1 : null,
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
    mensaje: esAnexo ? 'Anexo cerrado e incorporado al consolidado. La original permanece intacta.' : escenariosADeshabilitar.length > 0
      ? `Planificacion cerrada como escenario original. Se deshabilitaron ${escenariosADeshabilitar.length} escenario(s) alternativo(s).`
      : 'Planificacion cerrada como escenario original y bloqueada para edicion.',
  };
}
