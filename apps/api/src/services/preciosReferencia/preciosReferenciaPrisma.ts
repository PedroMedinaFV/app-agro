import type {
  DestinoVentaReferencia,
  GuardarDestinoVentaReferenciaRequest,
  GuardarDestinoVentaReferenciaResponse,
  GuardarPrecioReferenciaRequest,
  GuardarPrecioReferenciaResponse,
  PrecioReferencia,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

type PrecioPrisma = Prisma.PrecioReferenciaGetPayload<Record<string, never>>;
type DestinoPrisma = Prisma.DestinoVentaReferenciaGetPayload<Record<string, never>>;

function mapearPrecio(precio: PrecioPrisma): PrecioReferencia {
  return {
    id: precio.id,
    clienteId: precio.clienteId,
    empresaErpId: precio.empresaErpId || undefined,
    actividadPlanificacionId: precio.actividadPlanificacionId,
    actividadErpId: precio.actividadErpId || undefined,
    especiePlanificacionId: precio.especiePlanificacionId || undefined,
    especieErpId: precio.especieErpId || undefined,
    cultivoErpId: precio.cultivoErpId || undefined,
    destinoVenta: precio.destinoVenta,
    valor: precio.valor,
    moneda: precio.moneda,
    unidad: precio.unidad,
    fuente: precio.fuente,
    observaciones: precio.observaciones || undefined,
    activo: precio.activo,
    createdAt: precio.createdAt.toISOString(),
    updatedAt: precio.updatedAt.toISOString(),
  };
}

function validarPrecio(precio: PrecioReferencia) {
  if (!precio.clienteId) {
    throw crearErrorValidacion('El precio debe tener clienteId.');
  }

  if (!precio.actividadPlanificacionId) {
    throw crearErrorValidacion('El precio debe tener actividadPlanificacionId.');
  }

  if (!precio.destinoVenta.trim()) {
    throw crearErrorValidacion('El precio debe tener destino de venta.');
  }

  if (precio.valor < 0) {
    throw crearErrorValidacion('El valor del precio no puede ser negativo.');
  }

  if (!precio.moneda.trim() || !precio.unidad.trim()) {
    throw crearErrorValidacion('El precio debe tener moneda y unidad.');
  }
}

function validarDestino(destino: DestinoVentaReferencia, usuario?: UsuarioAuditoria) {
  if (!destino.clienteId) {
    throw crearErrorValidacion('El destino debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== destino.clienteId) {
    throw crearErrorValidacion('No se puede modificar un destino de otro cliente.', 403);
  }

  if (!destino.destinoVenta.trim()) {
    throw crearErrorValidacion('El destino debe tener nombre.');
  }

}

function mapearDestino(destino: DestinoPrisma): DestinoVentaReferencia {
  return {
    id: destino.id,
    clienteId: destino.clienteId,
    empresaErpId: destino.empresaErpId || undefined,
    zonaErpId: destino.zonaErpId || undefined,
    campoPlanificacionId: destino.campoPlanificacionId || undefined,
    campoErpId: destino.campoErpId || undefined,
    actividadPlanificacionId: destino.actividadPlanificacionId || undefined,
    actividadErpId: destino.actividadErpId || undefined,
    especieErpId: destino.especieErpId || undefined,
    cultivoErpId: destino.cultivoErpId || undefined,
    destinoVenta: destino.destinoVenta,
    destinoVentaNormalizado: destino.destinoVentaNormalizado,
    descripcion: destino.descripcion || undefined,
    activo: destino.activo,
    createdAt: destino.createdAt.toISOString(),
    updatedAt: destino.updatedAt.toISOString(),
  };
}

async function asegurarDestinoReferencia(
  tx: Prisma.TransactionClient,
  precio: PrecioReferencia,
  request: GuardarPrecioReferenciaRequest,
  usuario?: UsuarioAuditoria,
) {
  const destinoVenta = limpiarTextoVisible(precio.destinoVenta);
  const destinoVentaNormalizado = normalizarTexto(destinoVenta);
  const destinoExistente = await tx.destinoVentaReferencia.findFirst({
    where: {
      clienteId: precio.clienteId,
      destinoVentaNormalizado,
    },
  });

  if (destinoExistente) {
    return destinoExistente;
  }

  const destinoCreado = await tx.destinoVentaReferencia.create({
    data: {
      clienteId: precio.clienteId,
      empresaErpId: precio.empresaErpId,
      destinoVenta,
      destinoVentaNormalizado,
      descripcion: `Destino creado desde precio ${destinoVenta}`,
      activo: true,
      createdBy: usuario?.id,
      updatedBy: usuario?.id,
    },
  });

  await registrarAuditoria(tx, {
    clienteId: precio.clienteId,
    usuario,
    entidad: 'DestinoVentaReferencia',
    entidadId: destinoCreado.id,
    accion: 'crear',
    origen: request.origen,
    motivo: request.motivo || 'Destino creado automaticamente al guardar precio de referencia.',
    valoresDespues: mapearDestino(destinoCreado),
    metadata: { creadoDesde: 'PrecioReferencia', precioReferenciaId: precio.id },
  });

  return destinoCreado;
}

export async function obtenerPreciosReferenciaPersistidos(clienteId: string): Promise<PrecioReferencia[]> {
  const precios = await prisma.precioReferencia.findMany({
    where: { clienteId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return precios.map(mapearPrecio);
}

export async function obtenerDestinosReferenciaPersistidos(clienteId: string): Promise<DestinoVentaReferencia[]> {
  const destinos = await prisma.destinoVentaReferencia.findMany({
    where: { clienteId },
    orderBy: [{ destinoVenta: 'asc' }],
  });

  return destinos.map(mapearDestino);
}

function prepararDestino(destino: DestinoVentaReferencia): DestinoVentaReferencia {
  const destinoVenta = limpiarTextoVisible(destino.destinoVenta);

  return {
    ...destino,
    destinoVenta,
    destinoVentaNormalizado: normalizarTexto(destinoVenta),
    descripcion: destino.descripcion ? limpiarTextoVisible(destino.descripcion) : undefined,
  };
}

export async function guardarDestinoReferenciaPersistido(
  id: string,
  request: GuardarDestinoVentaReferenciaRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarDestinoVentaReferenciaResponse> {
  const destino = prepararDestino({ ...request.destino, id });
  validarDestino(destino, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.destinoVentaReferencia.findUnique({ where: { id } });
    const existenteMismoNombre = await tx.destinoVentaReferencia.findUnique({
      where: {
        clienteId_destinoVentaNormalizado: {
          clienteId: destino.clienteId,
          destinoVentaNormalizado: destino.destinoVentaNormalizado,
        },
      },
    });

    if (existenteMismoNombre && existenteMismoNombre.id !== id) {
      throw crearErrorValidacion('Ya existe un destino con ese nombre.');
    }

    const guardado = await tx.destinoVentaReferencia.upsert({
      where: { id },
      update: {
        empresaErpId: destino.empresaErpId,
        zonaErpId: destino.zonaErpId,
        campoPlanificacionId: destino.campoPlanificacionId,
        campoErpId: destino.campoErpId,
        actividadPlanificacionId: destino.actividadPlanificacionId,
        actividadErpId: destino.actividadErpId,
        especieErpId: destino.especieErpId,
        cultivoErpId: destino.cultivoErpId,
        destinoVenta: destino.destinoVenta,
        destinoVentaNormalizado: destino.destinoVentaNormalizado,
        descripcion: destino.descripcion,
        activo: destino.activo,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: destino.clienteId,
        empresaErpId: destino.empresaErpId,
        zonaErpId: destino.zonaErpId,
        campoPlanificacionId: destino.campoPlanificacionId,
        campoErpId: destino.campoErpId,
        actividadPlanificacionId: destino.actividadPlanificacionId,
        actividadErpId: destino.actividadErpId,
        especieErpId: destino.especieErpId,
        cultivoErpId: destino.cultivoErpId,
        destinoVenta: destino.destinoVenta,
        destinoVentaNormalizado: destino.destinoVentaNormalizado,
        descripcion: destino.descripcion,
        activo: destino.activo,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const destinoMapeado = mapearDestino(guardado);

    await registrarAuditoria(tx, {
      clienteId: destino.clienteId,
      usuario,
      entidad: 'DestinoVentaReferencia',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearDestino(existente) : undefined,
      valoresDespues: destinoMapeado,
    });

    return {
      destino: destinoMapeado,
      auditado: true,
      mensaje: existente ? 'Destino actualizado con auditoria.' : 'Destino creado con auditoria.',
    };
  });
}

export async function guardarPrecioReferenciaPersistido(
  id: string,
  request: GuardarPrecioReferenciaRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarPrecioReferenciaResponse> {
  const precio = { ...request.precio, id, destinoVenta: limpiarTextoVisible(request.precio.destinoVenta) };
  validarPrecio(precio);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.precioReferencia.findUnique({ where: { id } });
    await asegurarDestinoReferencia(tx, precio, request, usuario);

    const guardado = await tx.precioReferencia.upsert({
      where: { id },
      update: {
        empresaErpId: precio.empresaErpId,
        actividadPlanificacionId: precio.actividadPlanificacionId,
        actividadErpId: precio.actividadErpId,
        especiePlanificacionId: precio.especiePlanificacionId,
        especieErpId: precio.especieErpId,
        cultivoErpId: precio.cultivoErpId,
        destinoVenta: precio.destinoVenta,
        valor: precio.valor,
        moneda: precio.moneda,
        unidad: precio.unidad,
        fuente: precio.fuente,
        observaciones: precio.observaciones,
        activo: precio.activo,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: precio.clienteId,
        empresaErpId: precio.empresaErpId,
        actividadPlanificacionId: precio.actividadPlanificacionId,
        actividadErpId: precio.actividadErpId,
        especiePlanificacionId: precio.especiePlanificacionId,
        especieErpId: precio.especieErpId,
        cultivoErpId: precio.cultivoErpId,
        destinoVenta: precio.destinoVenta,
        valor: precio.valor,
        moneda: precio.moneda,
        unidad: precio.unidad,
        fuente: precio.fuente,
        observaciones: precio.observaciones,
        activo: precio.activo,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const precioMapeado = mapearPrecio(guardado);

    await registrarAuditoria(tx, {
      clienteId: precio.clienteId,
      usuario,
      entidad: 'PrecioReferencia',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearPrecio(existente) : undefined,
      valoresDespues: precioMapeado,
    });

    return {
      precio: precioMapeado,
      auditado: true,
      mensaje: existente ? 'Precio actualizado con auditoria.' : 'Precio creado con auditoria.',
    };
  });
}
