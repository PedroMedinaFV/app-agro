import type {
  DestinoApp,
  GuardarDestinoAppRequest,
  GuardarDestinoAppResponse,
  GuardarPrecioReferenciaRequest,
  GuardarPrecioReferenciaResponse,
  PrecioApp,
  PrecioReferencia,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  limpiarTextoVisible,
  normalizarTexto,
  prepararDestinoReferencia,
  prepararPrecioReferencia,
  validarDestinoReferencia,
  validarPrecioReferencia,
} from './validacionesPreciosReferencia';

type PrecioPrisma = Prisma.PrecioAppGetPayload<Record<string, never>>;
type DestinoPrisma = Prisma.DestinoAppGetPayload<Record<string, never>>;

function mapearPrecio(precio: PrecioPrisma): PrecioReferencia {
  return {
    id: precio.id,
    clienteId: precio.clienteId,
    empresaErpId: precio.empresaErpId || undefined,
    actividadAppId: precio.actividadAppId || undefined,
    actividadErpId: precio.actividadErpId || undefined,
    especieAppId: precio.especieAppId || undefined,
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

function mapearDestino(destino: DestinoPrisma): DestinoApp {
  return {
    id: destino.id,
    clienteId: destino.clienteId,
    empresaErpId: destino.empresaErpId || undefined,
    zonaErpId: destino.zonaErpId || undefined,
    campoAppId: destino.campoAppId || undefined,
    campoErpId: destino.campoErpId || undefined,
    actividadAppId: destino.actividadAppId || undefined,
    actividadErpId: destino.actividadErpId || undefined,
    especieErpId: destino.especieErpId || undefined,
    cultivoErpId: destino.cultivoErpId || undefined,
    destinoVenta: destino.destinoVenta,
    destinoVentaNormalizado: destino.destinoVentaNormalizado,
    descripcion: destino.descripcion || undefined,
    activo: destino.activo,
    origen: 'app',
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
  const destinoExistente = await tx.destinoApp.findFirst({
    where: {
      clienteId: precio.clienteId,
      destinoVentaNormalizado,
    },
  });

  if (destinoExistente) {
    return destinoExistente;
  }

  const destinoCreado = await tx.destinoApp.create({
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
    entidad: 'DestinoApp',
    entidadId: destinoCreado.id,
    accion: 'crear',
    origen: request.origen,
    motivo: request.motivo || 'Destino creado automaticamente al guardar precio de referencia.',
    valoresDespues: mapearDestino(destinoCreado),
    metadata: { creadoDesde: 'PrecioApp', precioAppId: precio.id },
  });

  return destinoCreado;
}

export async function obtenerPreciosReferenciaPersistidos(clienteId: string): Promise<PrecioReferencia[]> {
  const precios = await prisma.precioApp.findMany({
    where: { clienteId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return precios.map(mapearPrecio);
}

export async function obtenerDestinosReferenciaPersistidos(clienteId: string): Promise<DestinoApp[]> {
  const destinos = await prisma.destinoApp.findMany({
    where: { clienteId },
    orderBy: [{ destinoVenta: 'asc' }],
  });
  const destinosMapeados = destinos.map(mapearDestino);
  const destinosExistentes = new Set(destinosMapeados.map((destino) => destino.destinoVentaNormalizado));
  const puertos = await prisma.erpPuerto.findMany({
    where: { empresaErpId: 'global', activo: true },
    orderBy: [{ nombre: 'asc' }],
  });
  const destinosDesdePuertos: DestinoApp[] = [];

  for (const puerto of puertos) {
    const destinoVenta = limpiarTextoVisible(puerto.nombre);
    const destinoVentaNormalizado = normalizarTexto(destinoVenta);

    if (destinosExistentes.has(destinoVentaNormalizado)) {
      continue;
    }

    destinosExistentes.add(destinoVentaNormalizado);
    destinosDesdePuertos.push({
      id: `puerto-${puerto.erpId}`,
      clienteId,
      empresaErpId: puerto.empresaErpId,
      destinoVenta,
      destinoVentaNormalizado,
      descripcion: `Puerto ERP ${puerto.codigo}`,
      activo: puerto.activo,
      origen: 'erp',
      createdAt: puerto.importadoEn.toISOString(),
      updatedAt: puerto.importadoEn.toISOString(),
    });
  }

  return [...destinosMapeados, ...destinosDesdePuertos]
    .sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta));
}

export async function guardarDestinoReferenciaPersistido(
  id: string,
  request: GuardarDestinoAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarDestinoAppResponse> {
  const destino = prepararDestinoReferencia({ ...request.destino, id });
  validarDestinoReferencia(destino, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.destinoApp.findUnique({ where: { id } });
    const existenteMismoNombre = await tx.destinoApp.findUnique({
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

    const guardado = await tx.destinoApp.upsert({
      where: { id },
      update: {
        empresaErpId: destino.empresaErpId,
        zonaErpId: destino.zonaErpId,
        campoAppId: destino.campoAppId,
        campoErpId: destino.campoErpId,
        actividadAppId: destino.actividadAppId,
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
        campoAppId: destino.campoAppId,
        campoErpId: destino.campoErpId,
        actividadAppId: destino.actividadAppId,
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
      entidad: 'DestinoApp',
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
  const precio: PrecioApp = prepararPrecioReferencia(id, request.precio, usuario);
  validarPrecioReferencia(precio);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.precioApp.findUnique({ where: { id } });

    if (existente && existente.clienteId !== precio.clienteId) {
      throw crearErrorValidacion('No se puede modificar un precio de otro cliente.', 403);
    }

    await asegurarDestinoReferencia(tx, precio, request, usuario);

    const guardado = await tx.precioApp.upsert({
      where: { id },
      update: {
        empresaErpId: precio.empresaErpId,
        actividadAppId: precio.actividadAppId,
        actividadErpId: precio.actividadErpId,
        especieAppId: precio.especieAppId,
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
        actividadAppId: precio.actividadAppId,
        actividadErpId: precio.actividadErpId,
        especieAppId: precio.especieAppId,
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
      entidad: 'PrecioApp',
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
