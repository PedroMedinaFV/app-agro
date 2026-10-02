import type { ConceptoGastoComercial } from '@agro/tipos';

type UsuarioCliente = {
  clienteId?: string;
};

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function prepararConceptoGastoComercial(concepto: ConceptoGastoComercial): ConceptoGastoComercial {
  const nombre = limpiarTextoVisible(concepto.nombre);
  const codigoBase = concepto.codigo ? concepto.codigo : nombre;

  return {
    ...concepto,
    codigo: normalizarTexto(codigoBase),
    nombre,
    nombreNormalizado: normalizarTexto(nombre),
    unidadCalculo: concepto.unidadCalculo || 'Tn',
    descripcion: concepto.descripcion ? limpiarTextoVisible(concepto.descripcion) : undefined,
    activo: concepto.activo,
  };
}

export function validarConceptoGastoComercial(concepto: ConceptoGastoComercial, usuario?: UsuarioCliente) {
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

  if (concepto.unidadCalculo !== 'Tn' && concepto.unidadCalculo !== 'Ha') {
    throw crearErrorValidacion('La unidad de calculo del concepto debe ser Tn o Ha.');
  }
}
