import type {
  ActividadApp,
  CampoApp,
  EpocaSiembraActividad,
  EspecieApp,
  InsumoApp,
  LoteApp,
  ServicioApp,
  TipoCultivoActividad,
  TipoGranoActividad,
  ZonaApp,
} from '@agro/tipos';

type UsuarioCliente = {
  clienteId?: string;
};

const TIPOS_GRANO_VALIDOS = new Set<TipoGranoActividad>(['fina', 'gruesa']);
const TIPOS_CULTIVO_VALIDOS = new Set<TipoCultivoActividad>(['primera', 'segunda']);
const EPOCAS_SIEMBRA_VALIDAS = new Set<EpocaSiembraActividad>(['invierno', 'verano']);

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

export function normalizarOmitirVacio<T extends string>(valor: T | undefined) {
  return valor && valor.trim() ? valor : undefined;
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

export function prepararActividadApp(actividad: ActividadApp): ActividadApp {
  const nombre = limpiarTextoVisible(actividad.nombre);

  return {
    ...actividad,
    empresaErpId: 'global',
    nombre,
    codigoInterno: actividad.codigoInterno ? normalizarCodigo(actividad.codigoInterno) : normalizarCodigo(nombre),
    tipoGrano: normalizarOmitirVacio(actividad.tipoGrano),
    tipoCultivo: normalizarOmitirVacio(actividad.tipoCultivo),
    epocaSiembra: normalizarOmitirVacio(actividad.epocaSiembra),
    estadoVinculacion: actividad.actividadErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarActividadAppBasica(actividad: ActividadApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(actividad, usuario, {
    faltante: 'La actividad debe tener clienteId.',
    otroCliente: 'No se puede modificar una actividad de otro cliente.',
  });

  if (!actividad.nombre.trim()) {
    throw crearErrorValidacion('La actividad debe tener nombre.');
  }

  if (!actividad.especieAppId && !actividad.especieErpId) {
    throw crearErrorValidacion('La actividad debe estar asociada a una especie.');
  }

  if (actividad.tipoGrano && !TIPOS_GRANO_VALIDOS.has(actividad.tipoGrano)) {
    throw crearErrorValidacion('El tipo de grano de la actividad no es valido.');
  }

  if (actividad.tipoCultivo && !TIPOS_CULTIVO_VALIDOS.has(actividad.tipoCultivo)) {
    throw crearErrorValidacion('El tipo de cultivo de la actividad no es valido.');
  }

  if (actividad.epocaSiembra && !EPOCAS_SIEMBRA_VALIDAS.has(actividad.epocaSiembra)) {
    throw crearErrorValidacion('La epoca de siembra de la actividad no es valida.');
  }
}

export function obtenerIdEspecieDesdeErpId(especieErpId: string) {
  const match = especieErpId.match(/especie:(\d+)$/);

  return match ? Number(match[1]) : undefined;
}

export function prepararInsumoApp(insumo: InsumoApp): InsumoApp {
  const nombre = limpiarTextoVisible(insumo.nombre);
  const codigoInterno = insumo.codigoInterno ? normalizarCodigo(insumo.codigoInterno) : normalizarCodigo(nombre);

  return {
    ...insumo,
    empresaErpId: 'global',
    nombre,
    codigoInterno,
    idTipoInsumo: insumo.idTipoInsumo,
    tipo: insumo.tipo ? limpiarTextoVisible(insumo.tipo) : undefined,
    unidad: limpiarTextoVisible(insumo.unidad || 'Unid'),
    moneda: limpiarTextoVisible(insumo.moneda || 'USD').toUpperCase(),
    estadoVinculacion: insumo.insumoErpId ? 'vinculado_erp' : 'provisorio',
  };
}

export function validarInsumoAppBasico(insumo: InsumoApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(insumo, usuario, {
    faltante: 'El insumo debe tener clienteId.',
    otroCliente: 'No se puede modificar un insumo de otro cliente.',
  });

  if (!insumo.empresaErpId) {
    throw crearErrorValidacion('El insumo debe tener empresaErpId.');
  }

  if (!insumo.nombre.trim()) {
    throw crearErrorValidacion('El insumo debe tener nombre.');
  }

  if (!insumo.unidad.trim()) {
    throw crearErrorValidacion('El insumo debe tener unidad.');
  }

  if (insumo.precioUnitarioEstimado !== undefined && insumo.precioUnitarioEstimado < 0) {
    throw crearErrorValidacion('El precio estimado no puede ser negativo.');
  }
}

export function prepararServicioApp(servicio: ServicioApp): ServicioApp {
  const nombre = limpiarTextoVisible(servicio.nombre);

  return {
    ...servicio,
    empresaErpId: 'global',
    codigo: normalizarCodigo(servicio.codigo || nombre),
    nombre,
    descripcionAbreviada: servicio.descripcionAbreviada ? limpiarTextoVisible(servicio.descripcionAbreviada) : undefined,
    unidadSugerida: limpiarTextoVisible(servicio.unidadSugerida || 'Ha'),
    estadoVinculacion: servicio.servicioErpId ? 'vinculado_erp' : 'provisorio',
    origen: servicio.servicioErpId ? 'erp' : 'provisorio',
  };
}

export function validarServicioAppBasico(servicio: ServicioApp, usuario?: UsuarioCliente) {
  validarClienteEntidad(servicio, usuario, {
    faltante: 'La labor debe tener clienteId.',
    otroCliente: 'No se puede modificar una labor de otro cliente.',
  });

  if (!servicio.codigo.trim()) {
    throw crearErrorValidacion('La labor debe tener codigo.');
  }

  if (!servicio.nombre.trim()) {
    throw crearErrorValidacion('La labor debe tener nombre.');
  }

  if (!servicio.unidadSugerida.trim()) {
    throw crearErrorValidacion('La labor debe tener unidad sugerida.');
  }

  if (servicio.costoUnitarioSugerido !== undefined && servicio.costoUnitarioSugerido < 0) {
    throw crearErrorValidacion('El costo sugerido no puede ser negativo.');
  }
}
