import type { GuardarLoteAppRequest, GuardarLoteAppResponse, LoteApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  prepararLoteApp,
  validarLoteAppBasico,
} from '../planificacion/validacionesPadronesApp';

type LotePrisma = Prisma.LoteAppGetPayload<Record<string, never>>;

function mapearLote(lote: LotePrisma): LoteApp {
  return {
    id: lote.id,
    clienteId: lote.clienteId,
    campoAppId: lote.campoAppId,
    loteErpId: lote.loteErpId || undefined,
    nombre: lote.nombre,
    codigoInterno: lote.codigoInterno || undefined,
    superficieTotal: lote.superficieTotal,
    superficieProductiva: lote.superficieProductiva,
    estadoVinculacion: lote.estadoVinculacion as LoteApp['estadoVinculacion'],
    createdAt: lote.createdAt.toISOString(),
    updatedAt: lote.updatedAt.toISOString(),
  };
}

async function validarLote(lote: LoteApp, usuario?: UsuarioAuditoria) {
  validarLoteAppBasico(lote, usuario);

  const campo = await prisma.campoApp.findUnique({ where: { id: lote.campoAppId } });

  if (!campo || campo.clienteId !== lote.clienteId) {
    throw crearErrorValidacion('El campo seleccionado no pertenece al cliente.', 403);
  }

  if (lote.loteErpId) {
    const loteErp = await prisma.erpLote.findUnique({ where: { erpId: lote.loteErpId } });

    if (!loteErp) {
      throw crearErrorValidacion('El lote ERP seleccionado no existe en la cache importada.');
    }

    if (campo.campoErpId && campo.campoErpId !== loteErp.campoErpId) {
      throw crearErrorValidacion('El lote ERP no pertenece al campo ERP vinculado al lote propio.');
    }

    const loteYaVinculado = await prisma.loteApp.findFirst({
      where: {
        clienteId: lote.clienteId,
        loteErpId: lote.loteErpId,
        id: { not: lote.id },
      },
    });

    if (loteYaVinculado) {
      throw crearErrorValidacion('Ese lote ERP ya esta vinculado a otro lote del cliente.');
    }
  }
}

export async function obtenerLotesAppPersistidos(clienteId: string): Promise<LoteApp[]> {
  const lotes = await prisma.loteApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return lotes.map(mapearLote);
}

export async function guardarLoteAppPersistido(
  id: string,
  request: GuardarLoteAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarLoteAppResponse> {
  const lote = prepararLoteApp({ ...request.lote, id });
  await validarLote(lote, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.loteApp.findUnique({ where: { id } });
    const existenteMismoCodigo = lote.codigoInterno
      ? await tx.loteApp.findFirst({
        where: {
          clienteId: lote.clienteId,
          campoAppId: lote.campoAppId,
          codigoInterno: lote.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe un lote con ese codigo para el campo.');
    }

    const guardado = await tx.loteApp.upsert({
      where: { id },
      update: {
        campoAppId: lote.campoAppId,
        loteErpId: lote.loteErpId ?? null,
        nombre: lote.nombre,
        codigoInterno: lote.codigoInterno ?? null,
        superficieTotal: lote.superficieTotal,
        superficieProductiva: lote.superficieProductiva,
        estadoVinculacion: lote.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: lote.clienteId,
        campoAppId: lote.campoAppId,
        loteErpId: lote.loteErpId ?? null,
        nombre: lote.nombre,
        codigoInterno: lote.codigoInterno ?? null,
        superficieTotal: lote.superficieTotal,
        superficieProductiva: lote.superficieProductiva,
        estadoVinculacion: lote.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const loteMapeado = mapearLote(guardado);

    await registrarAuditoria(tx, {
      clienteId: lote.clienteId,
      usuario,
      entidad: 'LoteApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearLote(existente) : undefined,
      valoresDespues: loteMapeado,
    });

    return {
      lote: loteMapeado,
      auditado: true,
      mensaje: existente ? 'Lote actualizado con auditoria.' : 'Lote creado con auditoria.',
    };
  });
}
