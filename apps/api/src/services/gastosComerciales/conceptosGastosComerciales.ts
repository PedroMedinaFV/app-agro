import type {
  ConceptoGastoComercial,
  ConceptoGastoComercialApp,
  GuardarConceptoGastoComercialRequest,
  GuardarConceptoGastoComercialResponse,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  prepararConceptoGastoComercial,
  validarConceptoGastoComercial,
} from './validacionesConceptosGastos';

type ConceptoPrisma = Prisma.ConceptoGastoComercialAppGetPayload<Record<string, never>>;

function mapearConcepto(concepto: ConceptoPrisma): ConceptoGastoComercial {
  return {
    id: concepto.id,
    clienteId: concepto.clienteId,
    codigo: concepto.codigo,
    nombre: concepto.nombre,
    nombreNormalizado: concepto.nombreNormalizado,
    unidadCalculo: (concepto.unidadCalculo as ConceptoGastoComercialApp['unidadCalculo']) || 'Tn',
    descripcion: concepto.descripcion || undefined,
    activo: concepto.activo,
    createdAt: concepto.createdAt.toISOString(),
    updatedAt: concepto.updatedAt.toISOString(),
  };
}

export async function obtenerConceptosGastosComercialesPersistidos(clienteId: string): Promise<ConceptoGastoComercial[]> {
  const conceptos = await prisma.conceptoGastoComercialApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return conceptos.map(mapearConcepto);
}

export async function guardarConceptoGastoComercialPersistido(
  id: string,
  request: GuardarConceptoGastoComercialRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarConceptoGastoComercialResponse> {
  const concepto = prepararConceptoGastoComercial({ ...request.concepto, id });
  validarConceptoGastoComercial(concepto, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.conceptoGastoComercialApp.findUnique({ where: { id } });
    const existenteMismoNombre = await tx.conceptoGastoComercialApp.findUnique({
      where: {
        clienteId_nombreNormalizado: {
          clienteId: concepto.clienteId,
          nombreNormalizado: concepto.nombreNormalizado,
        },
      },
    });

    if (existenteMismoNombre && existenteMismoNombre.id !== id) {
      throw crearErrorValidacion('Ya existe un concepto de gasto comercial con ese nombre.');
    }

    const guardado = await tx.conceptoGastoComercialApp.upsert({
      where: { id },
      update: {
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        nombreNormalizado: concepto.nombreNormalizado,
        unidadCalculo: concepto.unidadCalculo,
        descripcion: concepto.descripcion,
        activo: concepto.activo,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: concepto.clienteId,
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        nombreNormalizado: concepto.nombreNormalizado,
        unidadCalculo: concepto.unidadCalculo,
        descripcion: concepto.descripcion,
        activo: concepto.activo,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const conceptoMapeado = mapearConcepto(guardado);

    await registrarAuditoria(tx, {
      clienteId: concepto.clienteId,
      usuario,
      entidad: 'ConceptoGastoComercialApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearConcepto(existente) : undefined,
      valoresDespues: conceptoMapeado,
    });

    return {
      concepto: conceptoMapeado,
      auditado: true,
      mensaje: existente ? 'Concepto actualizado con auditoria.' : 'Concepto creado con auditoria.',
    };
  });
}
