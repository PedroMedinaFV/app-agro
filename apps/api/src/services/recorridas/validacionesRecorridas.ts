import type { CrearRecorridaCampoRequest, EstadoRecorridaCampo, ObjetivoRecorridaCampo } from '@agro/tipos';

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function esObjetivoRecorrida(valor: string): valor is ObjetivoRecorridaCampo {
  return ['monitoreo_general', 'plagas', 'malezas', 'enfermedades', 'emergencia', 'cosecha', 'otro'].includes(valor);
}

export function esEstadoInicialRecorrida(valor: string): valor is Extract<EstadoRecorridaCampo, 'borrador' | 'en_curso'> {
  return valor === 'borrador' || valor === 'en_curso';
}

export function validarDatosBasicosRecorrida(request: CrearRecorridaCampoRequest) {
  if (!['web', 'mobile', 'api'].includes(request.origen)) {
    throw crearErrorValidacion('El origen de la recorrida no es valido.');
  }

  const titulo = limpiarTextoVisible(request.titulo);
  if (!titulo) {
    throw crearErrorValidacion('La recorrida debe tener titulo.');
  }

  const objetivo = request.objetivo || 'monitoreo_general';
  if (!esObjetivoRecorrida(objetivo)) {
    throw crearErrorValidacion('El objetivo de la recorrida no es valido.');
  }

  const estado = request.estado || 'en_curso';
  if (!esEstadoInicialRecorrida(estado)) {
    throw crearErrorValidacion('El estado inicial de la recorrida no es valido.');
  }

  const fechaInicio = new Date(request.fechaInicio);
  if (Number.isNaN(fechaInicio.getTime())) {
    throw crearErrorValidacion('La fecha de inicio no es valida.');
  }

  return {
    titulo,
    objetivo,
    estado,
    fechaInicio,
    observaciones: request.observaciones ? limpiarTextoVisible(request.observaciones) : null,
  };
}

export function validarCierreRecorrida(estadoActual: EstadoRecorridaCampo, fechaCierre?: string) {
  if (estadoActual === 'cerrada' || estadoActual === 'cancelada') {
    throw crearErrorValidacion('La recorrida ya no se puede cerrar.');
  }

  const fecha = fechaCierre ? new Date(fechaCierre) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    throw crearErrorValidacion('La fecha de cierre no es valida.');
  }

  return fecha;
}
