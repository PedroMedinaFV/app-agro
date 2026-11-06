import type { DestinoApp, PrecioApp, PrecioReferencia } from '@agro/tipos';

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

export function validarPrecioReferencia(precio: PrecioReferencia) {
  if (!precio.clienteId) {
    throw crearErrorValidacion('El precio debe tener clienteId.');
  }

  if (!precio.especieAppId && !precio.especieErpId) {
    throw crearErrorValidacion('El precio debe tener especieAppId o especieErpId.');
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

export function obtenerClienteAutorizado(precio: PrecioReferencia, usuario?: UsuarioCliente) {
  if (usuario?.clienteId) {
    return usuario.clienteId;
  }

  return precio.clienteId;
}

export function prepararPrecioReferencia(id: string, precio: PrecioApp, usuario?: UsuarioCliente): PrecioApp {
  return {
    ...precio,
    id,
    clienteId: obtenerClienteAutorizado(precio, usuario),
    destinoVenta: limpiarTextoVisible(precio.destinoVenta),
  };
}

export function validarDestinoReferencia(destino: DestinoApp, usuario?: UsuarioCliente) {
  if (destino.origen === 'erp' || destino.id.startsWith('puerto-')) {
    throw crearErrorValidacion('Los destinos importados desde ERP no se pueden editar desde Agro App.', 403);
  }

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

export function prepararDestinoReferencia(destino: DestinoApp): DestinoApp {
  const destinoVenta = limpiarTextoVisible(destino.destinoVenta);

  return {
    ...destino,
    destinoVenta,
    destinoVentaNormalizado: normalizarTexto(destinoVenta),
    descripcion: destino.descripcion ? limpiarTextoVisible(destino.descripcion) : undefined,
  };
}
