import type {
  ConceptoGastoComercial,
  GuardarConceptoGastoComercialRequest,
  GuardarConceptoGastoComercialResponse,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ConceptoPrisma = Prisma.ConceptoGastoComercialGetPayload<Record<string, never>>;

function normalizarTexto(valor: string) {
  return valor.trim().replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function mapearConcepto(concepto: ConceptoPrisma): ConceptoGastoComercial {
  return {
    id: concepto.id,
    clienteId: concepto.clienteId,
    codigo: concepto.codigo,
    nombre: concepto.nombre,
    nombreNormalizado: concepto.nombreNormalizado,
    descripcion: concepto.descripcion || undefined,
    activo: concepto.activo,
    createdAt: concepto.createdAt.toISOString(),
    updatedAt: concepto.updatedAt.toISOString(),
  };
}

export function obtenerConceptosGastosComercialesSemilla(clienteId: string): ConceptoGastoComercial[] {
  const ahora = new Date().toISOString();
  const conceptos = [
    { id: 'concepto-gasto-flete', codigo: 'FLETE', nombre: 'Flete', descripcion: 'Transporte de cereal' },
    { id: 'concepto-gasto-acondicionamiento', codigo: 'ACOND', nombre: 'Acondicionamiento', descripcion: 'Secado, zarandeo o acondicionamiento comercial' },
    { id: 'concepto-gasto-comision', codigo: 'COM', nombre: 'Comision comercial', descripcion: 'Comision o intermediacion comercial' },
    { id: 'concepto-gasto-secada', codigo: 'SEC', nombre: 'Secada' },
    { id: 'concepto-gasto-puerto-acopio', codigo: 'PYA', nombre: 'Puerto / acopio' },
    { id: 'concepto-gasto-otros', codigo: 'OTROS', nombre: 'Otros gastos de venta' },
  ];

  return conceptos.map((concepto) => ({
    ...concepto,
    clienteId,
    nombreNormalizado: normalizarTexto(concepto.nombre),
    activo: true,
    createdAt: ahora,
    updatedAt: ahora,
  }));
}

export async function obtenerConceptosGastosComercialesPersistidos(clienteId: string): Promise<ConceptoGastoComercial[]> {
  const conceptos = await prisma.conceptoGastoComercial.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return conceptos.map(mapearConcepto);
}

function prepararConcepto(concepto: ConceptoGastoComercial): ConceptoGastoComercial {
  const nombre = limpiarTextoVisible(concepto.nombre);
  const codigoBase = concepto.codigo ? concepto.codigo : nombre;

  return {
    ...concepto,
    codigo: normalizarTexto(codigoBase),
    nombre,
    nombreNormalizado: normalizarTexto(nombre),
    descripcion: concepto.descripcion ? limpiarTextoVisible(concepto.descripcion) : undefined,
    activo: concepto.activo,
  };
}

function validarConcepto(concepto: ConceptoGastoComercial, usuario?: UsuarioAuditoria) {
  if (!concepto.clienteId) {
    throw crearErrorValidacion('El concepto debe tener clienteId.');
  }

  if (usuario?.clienteId && usuario.clienteId !== concepto.clienteId) {
    throw crearErrorValidacion('No se puede modificar un concepto de otro cliente.', 403);
  }

  if (!concepto.nombre.trim()) {
    throw crearErrorValidacion('El concepto debe tener nombre.');
  }

  if (!concepto.codigo.trim()) {
    throw crearErrorValidacion('El concepto debe tener codigo.');
  }
}

export async function guardarConceptoGastoComercialPersistido(
  id: string,
  request: GuardarConceptoGastoComercialRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarConceptoGastoComercialResponse> {
  const concepto = prepararConcepto({ ...request.concepto, id });
  validarConcepto(concepto, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.conceptoGastoComercial.findUnique({ where: { id } });
    const existenteMismoNombre = await tx.conceptoGastoComercial.findUnique({
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

    const guardado = await tx.conceptoGastoComercial.upsert({
      where: { id },
      update: {
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        nombreNormalizado: concepto.nombreNormalizado,
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
      entidad: 'ConceptoGastoComercial',
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
