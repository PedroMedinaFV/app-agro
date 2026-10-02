import type { CrearPrecipitacionRequest } from '@agro/tipos';

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function validarDatosBasicosPrecipitacion(request: CrearPrecipitacionRequest) {
  if (!['web', 'mobile', 'api'].includes(request.origen)) {
    throw crearErrorValidacion('El origen de la precipitacion no es valido.');
  }

  if (!request.campoAppId) {
    throw crearErrorValidacion('La precipitacion debe tener campo.');
  }

  if (!Number.isFinite(request.milimetros) || request.milimetros <= 0) {
    throw crearErrorValidacion('Los milimetros deben ser mayores a cero.');
  }

  if (request.milimetros > 1000) {
    throw crearErrorValidacion('Los milimetros informados superan el maximo permitido para una carga manual.');
  }

  const fechaEvento = new Date(request.fechaEvento);
  if (Number.isNaN(fechaEvento.getTime())) {
    throw crearErrorValidacion('La fecha del evento no es valida.');
  }

  return {
    fechaEvento,
    observaciones: request.observaciones ? limpiarTextoVisible(request.observaciones) : null,
  };
}
