import type {
  CopiarProtocoloRequest,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  ProtocoloEtapa,
  ProtocoloInsumo,
  ProtocoloLabor,
  ProtocoloProductivoDetalle,
  ProtocolosSnapshot,
} from '@agro/tipos';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from './auditoria';

function crearErrorValidacion(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;

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

function validarFechasProtocolo(protocolo: ProtocoloProductivoDetalle) {
  const etapasSiembra = protocolo.etapas.filter((etapa) => ['siembra', 'siembra directa'].includes(etapa.nombre.trim().toLowerCase()));

  if (protocolo.tipoFecha === 'relativa_siembra') {
    for (const etapa of protocolo.etapas) {
      if (!Number.isInteger(etapa.diasDesdeSiembra)) {
        throw crearErrorValidacion('Las etapas relativas a siembra deben tener diasDesdeSiembra entero. Puede ser negativo.');
      }
    }

    if (etapasSiembra.length && !protocolo.fechaSiembra) {
      throw crearErrorValidacion('La fecha de siembra es obligatoria si el protocolo relativo tiene etapa Siembra o Siembra directa.');
    }

    for (const etapa of etapasSiembra) {
      if (etapa.diasDesdeSiembra !== 0) {
        throw crearErrorValidacion('La etapa Siembra o Siembra directa debe tener diasDesdeSiembra igual a 0.');
      }
    }
  }

  if (protocolo.tipoFecha === 'absoluta') {
    for (const etapa of protocolo.etapas) {
      if (!etapa.fechaObjetivo) {
        throw crearErrorValidacion('Las etapas absolutas deben tener fechaObjetivo.');
      }
    }
  }
}

function validarItemsProtocolo(protocolo: ProtocoloProductivoDetalle) {
  for (const etapa of protocolo.etapas) {
    if (!etapa.estadioReferenciaId) {
      throw crearErrorValidacion('Cada etapa del protocolo debe tener un estadio.');
    }

    for (const labor of etapa.labores) {
      if (!Number.isFinite(labor.indiceAplicacion) || labor.indiceAplicacion < 0 || labor.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de labores debe estar entre 0 y 1.');
      }
    }

    for (const insumo of etapa.insumos) {
      if (!Number.isFinite(insumo.indiceAplicacion) || insumo.indiceAplicacion < 0 || insumo.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de insumos debe estar entre 0 y 1.');
      }
    }
  }
}

function calcularCostoProtocolo(protocolo: ProtocoloProductivoDetalle) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + calcularCostoLabor(labor), 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + calcularCostoInsumo(insumo), 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}

function calcularCostoLabor(labor: ProtocoloLabor) {
  return labor.cantidadPorHa * labor.costoUnitario * labor.indiceAplicacion;
}

function calcularCostoInsumo(insumo: ProtocoloInsumo) {
  return insumo.dosisPorHa * insumo.precioUnitarioEstimado * insumo.indiceAplicacion;
}

function validarProtocolo(protocolo: ProtocoloProductivoDetalle) {
  if (!protocolo.clienteId) {
    throw crearErrorValidacion('El protocolo debe tener clienteId.');
  }

  if (!protocolo.campaniaErpId) {
    throw crearErrorValidacion('El protocolo debe tener campaniaErpId.');
  }

  if (!protocolo.actividadPlanificacionId) {
    throw crearErrorValidacion('El protocolo debe tener actividadPlanificacionId.');
  }

  validarFechasProtocolo(protocolo);
  validarItemsProtocolo(protocolo);
}

type ProtocoloPrisma = Prisma.ProtocoloProductivoGetPayload<{
  include: {
    etapas: {
      include: {
        labores: true;
        insumos: true;
      };
      orderBy: { orden: 'asc' };
    };
  };
}>;

function mapearLabor(labor: ProtocoloPrisma['etapas'][number]['labores'][number]): ProtocoloLabor {
  return {
    id: labor.id,
    etapaId: labor.etapaId,
    laborReferenciaId: labor.laborReferenciaId || undefined,
    indiceAplicacion: labor.indiceAplicacion,
    nombre: labor.nombre,
    descripcion: labor.descripcion || undefined,
    unidad: labor.unidad,
    cantidadPorHa: labor.cantidadPorHa,
    costoUnitario: labor.costoUnitario,
    costoPorHa: labor.costoPorHa,
    momentoEstimado: labor.momentoEstimado || undefined,
  };
}

function mapearInsumo(insumo: ProtocoloPrisma['etapas'][number]['insumos'][number]): ProtocoloInsumo {
  return {
    id: insumo.id,
    etapaId: insumo.etapaId,
    indiceAplicacion: insumo.indiceAplicacion,
    insumoPlanificacionId: insumo.insumoPlanificacionId,
    insumoErpId: insumo.insumoErpId || undefined,
    nombre: insumo.nombre,
    tipo: insumo.tipo || undefined,
    unidad: insumo.unidad,
    dosisPorHa: insumo.dosisPorHa,
    precioUnitarioEstimado: insumo.precioUnitarioEstimado,
    costoPorHa: insumo.costoPorHa,
    momentoEstimado: insumo.momentoEstimado || undefined,
  };
}

function mapearEtapa(etapa: ProtocoloPrisma['etapas'][number]): ProtocoloEtapa {
  return {
    id: etapa.id,
    protocoloId: etapa.protocoloId,
    estadioReferenciaId: etapa.estadioReferenciaId || undefined,
    estadioCodigo: etapa.estadioCodigo || undefined,
    orden: etapa.orden,
    nombre: etapa.nombre,
    descripcion: etapa.descripcion || undefined,
    fechaObjetivo: serializarFecha(etapa.fechaObjetivo),
    diasDesdeSiembra: etapa.diasDesdeSiembra ?? undefined,
    observaciones: etapa.observaciones || undefined,
    labores: etapa.labores.map(mapearLabor),
    insumos: etapa.insumos.map(mapearInsumo),
  };
}

function mapearProtocolo(protocolo: ProtocoloPrisma): ProtocoloProductivoDetalle {
  return {
    id: protocolo.id,
    clienteId: protocolo.clienteId,
    nombre: protocolo.nombre,
    descripcion: protocolo.descripcion,
    protocoloOrigenId: protocolo.protocoloOrigenId || undefined,
    campaniaErpId: protocolo.campaniaErpId,
    actividadPlanificacionId: protocolo.actividadPlanificacionId,
    actividadErpId: protocolo.actividadErpId || undefined,
    tipoFecha: protocolo.tipoFecha as ProtocoloProductivoDetalle['tipoFecha'],
    fechaSiembra: serializarFecha(protocolo.fechaSiembra),
    zonaPlanificacionId: protocolo.zonaPlanificacionId || undefined,
    campoPlanificacionId: protocolo.campoPlanificacionId || undefined,
    costoEstimadoPorHa: protocolo.costoEstimadoPorHa,
    activo: protocolo.activo,
    createdAt: protocolo.createdAt.toISOString(),
    updatedAt: protocolo.updatedAt.toISOString(),
    etapas: protocolo.etapas.map(mapearEtapa),
  };
}

async function reemplazarEtapas(tx: Prisma.TransactionClient, protocolo: ProtocoloProductivoDetalle) {
  await tx.protocoloEtapa.deleteMany({ where: { protocoloId: protocolo.id } });

  for (const [indice, etapa] of protocolo.etapas.entries()) {
    await tx.protocoloEtapa.create({
      data: {
        id: etapa.id,
        protocoloId: protocolo.id,
        estadioReferenciaId: etapa.estadioReferenciaId,
        estadioCodigo: etapa.estadioCodigo,
        orden: etapa.orden || indice + 1,
        nombre: etapa.nombre,
        descripcion: etapa.descripcion,
        fechaObjetivo: parsearFecha(etapa.fechaObjetivo),
        diasDesdeSiembra: etapa.diasDesdeSiembra,
        observaciones: etapa.observaciones,
        labores: {
          create: etapa.labores.map((labor) => ({
            id: labor.id,
            laborReferenciaId: labor.laborReferenciaId,
            indiceAplicacion: labor.indiceAplicacion,
            nombre: labor.nombre,
            descripcion: labor.descripcion,
            unidad: labor.unidad,
            cantidadPorHa: labor.cantidadPorHa,
            costoUnitario: labor.costoUnitario,
            costoPorHa: calcularCostoLabor(labor),
            momentoEstimado: labor.momentoEstimado,
          })),
        },
        insumos: {
          create: etapa.insumos.map((insumo) => ({
            id: insumo.id,
            indiceAplicacion: insumo.indiceAplicacion,
            insumoPlanificacionId: insumo.insumoPlanificacionId,
            insumoErpId: insumo.insumoErpId,
            nombre: insumo.nombre,
            tipo: insumo.tipo,
            unidad: insumo.unidad,
            dosisPorHa: insumo.dosisPorHa,
            precioUnitarioEstimado: insumo.precioUnitarioEstimado,
            costoPorHa: calcularCostoInsumo(insumo),
            momentoEstimado: insumo.momentoEstimado,
          })),
        },
      },
    });
  }
}

const incluirDetalleProtocolo = {
  etapas: {
    include: {
      labores: true,
      insumos: true,
    },
    orderBy: { orden: 'asc' as const },
  },
};

export async function obtenerProtocolosPersistidos(clienteId: string): Promise<ProtocolosSnapshot> {
  const registros = await prisma.protocoloProductivo.findMany({
    where: { clienteId },
    include: incluirDetalleProtocolo,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return {
    protocolos: registros.map(mapearProtocolo),
    sincronizadoEn: new Date().toISOString(),
  };
}

async function guardarProtocoloConCliente(
  client: PrismaClient | Prisma.TransactionClient,
  protocolo: ProtocoloProductivoDetalle,
) {
  return client.protocoloProductivo.upsert({
    where: { id: protocolo.id },
    update: {
      nombre: protocolo.nombre,
      descripcion: protocolo.descripcion,
      protocoloOrigenId: protocolo.protocoloOrigenId,
      empresaErpId: protocolo.empresaErpId,
      campaniaErpId: protocolo.campaniaErpId,
      actividadPlanificacionId: protocolo.actividadPlanificacionId,
      actividadErpId: protocolo.actividadErpId,
      tipoFecha: protocolo.tipoFecha,
      fechaSiembra: parsearFecha(protocolo.fechaSiembra),
      zonaPlanificacionId: protocolo.zonaPlanificacionId,
      campoPlanificacionId: protocolo.campoPlanificacionId,
      costoEstimadoPorHa: calcularCostoProtocolo(protocolo),
      activo: protocolo.activo,
    },
    create: {
      id: protocolo.id,
      clienteId: protocolo.clienteId,
      nombre: protocolo.nombre,
      descripcion: protocolo.descripcion,
      protocoloOrigenId: protocolo.protocoloOrigenId,
      empresaErpId: protocolo.empresaErpId,
      campaniaErpId: protocolo.campaniaErpId,
      actividadPlanificacionId: protocolo.actividadPlanificacionId,
      actividadErpId: protocolo.actividadErpId,
      tipoFecha: protocolo.tipoFecha,
      fechaSiembra: parsearFecha(protocolo.fechaSiembra),
      zonaPlanificacionId: protocolo.zonaPlanificacionId,
      campoPlanificacionId: protocolo.campoPlanificacionId,
      costoEstimadoPorHa: calcularCostoProtocolo(protocolo),
      activo: protocolo.activo,
    },
    include: incluirDetalleProtocolo,
  });
}

export async function guardarProtocoloPersistido(
  id: string,
  request: GuardarProtocoloRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarProtocoloResponse> {
  const protocolo = { ...request.protocolo, id };
  validarProtocolo(protocolo);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.protocoloProductivo.findUnique({
      where: { id },
      include: incluirDetalleProtocolo,
    });
    const accion = existente ? 'actualizar' : 'crear';
    const guardado = await guardarProtocoloConCliente(tx, protocolo);

    await reemplazarEtapas(tx, protocolo);

    const completo = await tx.protocoloProductivo.findUniqueOrThrow({
      where: { id },
      include: incluirDetalleProtocolo,
    });
    const protocoloMapeado = mapearProtocolo(completo);

    await registrarAuditoria(tx, {
      clienteId: protocolo.clienteId,
      usuario,
      entidad: 'ProtocoloProductivo',
      entidadId: id,
      accion,
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearProtocolo(existente) : undefined,
      valoresDespues: protocoloMapeado,
    });

    return {
      protocolo: protocoloMapeado,
      auditado: true,
      mensaje: guardado ? 'Protocolo guardado con auditoria.' : 'Protocolo guardado.',
    };
  });
}

export async function copiarProtocoloPersistido(
  id: string,
  request: CopiarProtocoloRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarProtocoloResponse> {
  const origen = await prisma.protocoloProductivo.findUnique({
    where: { id },
    include: incluirDetalleProtocolo,
  });

  if (!origen) {
    throw crearErrorValidacion('No existe el protocolo a copiar.');
  }

  const ahora = new Date().toISOString();
  const nuevoId = `protocolo-${Date.now()}`;
  const protocoloOrigen = mapearProtocolo(origen);
  const protocoloNuevo: ProtocoloProductivoDetalle = {
    ...protocoloOrigen,
    id: nuevoId,
    nombre: request.nombre || `${protocoloOrigen.nombre} - copia`,
    protocoloOrigenId: protocoloOrigen.id,
    createdAt: ahora,
    updatedAt: ahora,
    etapas: protocoloOrigen.etapas.map((etapa, etapaIndice) => {
      const etapaId = `${nuevoId}-etapa-${etapaIndice + 1}`;

      return {
        ...etapa,
        id: etapaId,
        protocoloId: nuevoId,
        labores: etapa.labores.map((labor, laborIndice) => ({
          ...labor,
          id: `${etapaId}-labor-${laborIndice + 1}`,
          etapaId,
        })),
        insumos: etapa.insumos.map((insumo, insumoIndice) => ({
          ...insumo,
          id: `${etapaId}-insumo-${insumoIndice + 1}`,
          etapaId,
        })),
      };
    }),
  };

  const respuesta = await guardarProtocoloPersistido(nuevoId, {
    protocolo: protocoloNuevo,
    motivo: request.motivo,
    origen: request.origen,
  }, usuario);

  await prisma.$transaction(async (tx) => {
    await registrarAuditoria(tx, {
      clienteId: protocoloOrigen.clienteId,
      usuario,
      entidad: 'ProtocoloProductivo',
      entidadId: nuevoId,
      accion: 'copiar',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: protocoloOrigen,
      valoresDespues: respuesta.protocolo,
      metadata: {
        protocoloOrigenId: protocoloOrigen.id,
        email: usuario?.email,
      },
    });
  });

  return {
    ...respuesta,
    mensaje: 'Protocolo copiado como registro independiente con auditoria.',
  };
}
