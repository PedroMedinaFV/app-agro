import type { EspecieApp, GuardarEspecieAppRequest, GuardarEspecieAppResponse } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type EspeciePrisma = Prisma.EspecieAppGetPayload<Record<string, never>>;

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

function mapearEspecie(especie: EspeciePrisma): EspecieApp {
  return {
    id: especie.id,
    clienteId: especie.clienteId,
    empresaErpId: especie.empresaErpId,
    especieErpId: especie.especieErpId || undefined,
    nombre: especie.nombre,
    codigoInterno: especie.codigoInterno || undefined,
    estadoVinculacion: especie.estadoVinculacion as EspecieApp['estadoVinculacion'],
    createdAt: especie.createdAt.toISOString(),
    updatedAt: especie.updatedAt.toISOString(),
  };
}

function prepararEspecie(especie: EspecieApp): EspecieApp {
  const nombre = limpiarTextoVisible(especie.nombre);

  return {
    ...especie,
    empresaErpId: especie.empresaErpId || 'global',
    nombre,
    codigoInterno: especie.codigoInterno ? normalizarCodigo(especie.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: especie.especieErpId ? 'vinculado_erp' : especie.estadoVinculacion || 'provisorio',
  };
}

async function validarEspecie(especie: EspecieApp, usuario?: UsuarioAuditoria) {
  if (!especie.clienteId) {
    throw crearErrorValidacion('La especie debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== especie.clienteId) {
    throw crearErrorValidacion('No se puede modificar una especie de otro cliente.', 403);
  }

  if (!especie.nombre.trim()) {
    throw crearErrorValidacion('La especie debe tener nombre.');
  }

  if (especie.especieErpId) {
    const especieErp = await prisma.erpEspecie.findUnique({ where: { erpId: especie.especieErpId } });

    if (!especieErp) {
      throw crearErrorValidacion('La especie ERP seleccionada no existe en la cache importada.');
    }

    const especieYaVinculada = await prisma.especieApp.findFirst({
      where: {
        clienteId: especie.clienteId,
        especieErpId: especie.especieErpId,
        id: { not: especie.id },
      },
    });

    if (especieYaVinculada) {
      throw crearErrorValidacion('Esa especie ERP ya esta vinculada a otra especie del cliente.');
    }
  }
}

export async function obtenerEspeciesAppPersistidas(clienteId: string): Promise<EspecieApp[]> {
  const especies = await prisma.especieApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return especies.map(mapearEspecie);
}

export async function guardarEspecieAppPersistida(
  id: string,
  request: GuardarEspecieAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarEspecieAppResponse> {
  const especie = prepararEspecie({ ...request.especie, id });
  await validarEspecie(especie, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.especieApp.findUnique({ where: { id } });
    const existenteMismoCodigo = especie.codigoInterno
      ? await tx.especieApp.findFirst({
        where: {
          clienteId: especie.clienteId,
          codigoInterno: especie.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe una especie con ese codigo interno.');
    }

    const guardada = await tx.especieApp.upsert({
      where: { id },
      update: {
        empresaErpId: especie.empresaErpId,
        especieErpId: especie.especieErpId ?? null,
        nombre: especie.nombre,
        codigoInterno: especie.codigoInterno ?? null,
        estadoVinculacion: especie.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: especie.clienteId,
        empresaErpId: especie.empresaErpId,
        especieErpId: especie.especieErpId ?? null,
        nombre: especie.nombre,
        codigoInterno: especie.codigoInterno ?? null,
        estadoVinculacion: especie.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const especieMapeada = mapearEspecie(guardada);

    await registrarAuditoria(tx, {
      clienteId: especie.clienteId,
      usuario,
      entidad: 'EspecieApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearEspecie(existente) : undefined,
      valoresDespues: especieMapeada,
    });

    return {
      especie: especieMapeada,
      auditado: true,
      mensaje: existente ? 'Especie actualizada con auditoria.' : 'Especie creada con auditoria.',
    };
  });
}
