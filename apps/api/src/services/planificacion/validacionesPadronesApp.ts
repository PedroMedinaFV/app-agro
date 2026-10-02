import type { CampoApp, EspecieApp, LoteApp, ZonaApp } from '@agro/tipos';

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

export function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function validarClienteEntidad(
  entidad: { clienteId: string },
  usuario: UsuarioCliente | undefined,
  mensajes: { faltante: string; otroCliente: string },
) {
  if (!entidad.clienteId) {
    throw crearErrorValidacion(mensajes.faltante);
  }

  if (usuario?.clienteId && usuario.clienteId !== entidad.clienteId) {
    throw crearErrorValidacion(mensajes.otroCliente, 403);
  }
}

export function prepararZonaApp(zona: ZonaApp): ZonaApp {
  const nombre = limpiarTextoVisible(zona.nombre);

  return {
    ...zona,
    empresaErpId: 'global',
    nombre,
    codigoInterno: zona.codigoInterno ? normalizarCodigo(zona.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: zona.zonaErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarZonaAppBasica(zona: ZonaApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(zona, usuario, {
    faltante: 'La zona debe tener clienteId.',
    otroCliente: 'No se puede modificar una zona de otro cliente.',
  });

  if (!zona.nombre.trim()) {
    throw crearErrorValidacion('La zona debe tener nombre.');
  }

  if (!['provisorio', 'vinculado_erp'].includes(zona.estadoVinculacion)) {
    throw crearErrorValidacion('El estado de vinculacion de la zona no es valido.');
  }
}

export function prepararCampoApp(campo: CampoApp): CampoApp {
  const nombre = limpiarTextoVisible(campo.nombre);

  return {
    ...campo,
    nombre,
    codigoInterno: campo.codigoInterno ? normalizarCodigo(campo.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: campo.campoErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarCampoAppBasico(campo: CampoApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(campo, usuario, {
    faltante: 'El campo debe tener clienteId.',
    otroCliente: 'No se puede modificar un campo de otro cliente.',
  });

  if (!campo.empresaErpId) {
    throw crearErrorValidacion('El campo debe tener empresaErpId.');
  }

  if (!campo.nombre.trim()) {
    throw crearErrorValidacion('El campo debe tener nombre.');
  }
}

export function obtenerIdZonaDesdeErpId(zonaErpId: string) {
  const match = zonaErpId.match(/zona:(\d+)$/);

  return match ? Number(match[1]) : undefined;
}

export function prepararLoteApp(lote: LoteApp): LoteApp {
  const nombre = limpiarTextoVisible(lote.nombre);

  return {
    ...lote,
    nombre,
    codigoInterno: lote.codigoInterno ? normalizarCodigo(lote.codigoInterno) : normalizarCodigo(nombre),
    superficieTotal: Number(lote.superficieTotal),
    superficieProductiva: Number(lote.superficieProductiva),
    estadoVinculacion: lote.loteErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarLoteAppBasico(lote: LoteApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(lote, usuario, {
    faltante: 'El lote debe tener clienteId.',
    otroCliente: 'No se puede modificar un lote de otro cliente.',
  });

  if (!lote.campoAppId) {
    throw crearErrorValidacion('El lote debe estar asociado a un campo propio de Agro App.');
  }

  if (!lote.nombre.trim()) {
    throw crearErrorValidacion('El lote debe tener nombre.');
  }

  if (!Number.isFinite(lote.superficieTotal) || lote.superficieTotal < 0) {
    throw crearErrorValidacion('La superficie total debe ser mayor o igual a cero.');
  }

  if (!Number.isFinite(lote.superficieProductiva) || lote.superficieProductiva < 0) {
    throw crearErrorValidacion('La superficie productiva debe ser mayor o igual a cero.');
  }

  if (lote.superficieProductiva > lote.superficieTotal) {
    throw crearErrorValidacion('La superficie productiva no puede superar la superficie total.');
  }
}

export function prepararEspecieApp(especie: EspecieApp): EspecieApp {
  const nombre = limpiarTextoVisible(especie.nombre);

  return {
    ...especie,
    empresaErpId: 'global',
    nombre,
    codigoInterno: especie.codigoInterno ? normalizarCodigo(especie.codigoInterno) : normalizarCodigo(nombre),
    estadoVinculacion: especie.especieErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarEspecieAppBasica(especie: EspecieApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(especie, usuario, {
    faltante: 'La especie debe tener clienteId.',
    otroCliente: 'No se puede modificar una especie de otro cliente.',
  });

  if (!especie.nombre.trim()) {
    throw crearErrorValidacion('La especie debe tener nombre.');
  }
}
