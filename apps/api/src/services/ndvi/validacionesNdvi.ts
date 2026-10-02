import type { GuardarMapaNdviRequest, LoteMapaNdvi } from '@agro/tipos';

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function esOrigenMapaNdvi(valor: string): valor is LoteMapaNdvi['origen'] {
  return valor === 'manual' || valor === 'proveedor_api' || valor === 'importacion' || valor === 'proceso_interno';
}

export function esEstadoMapaNdvi(valor: string): valor is LoteMapaNdvi['estado'] {
  return valor === 'pendiente_procesamiento' || valor === 'procesado' || valor === 'rechazado' || valor === 'archivado';
}

export function validarNumeroOpcional(valor: number | undefined, campo: string, minimo?: number, maximo?: number) {
  if (valor === undefined) {
    return;
  }

  if (!Number.isFinite(valor)) {
    throw crearErrorValidacion(`${campo} debe ser numerico.`);
  }

  if (minimo !== undefined && valor < minimo) {
    throw crearErrorValidacion(`${campo} debe ser mayor o igual a ${minimo}.`);
  }

  if (maximo !== undefined && valor > maximo) {
    throw crearErrorValidacion(`${campo} debe ser menor o igual a ${maximo}.`);
  }
}

export function validarRangosNdvi(mapa: GuardarMapaNdviRequest['mapa']) {
  validarNumeroOpcional(mapa.resolucionMetros, 'La resolucion', 0);
  validarNumeroOpcional(mapa.nubosidadPorcentaje, 'La nubosidad', 0, 100);
  validarNumeroOpcional(mapa.ndviPromedio, 'El NDVI promedio', -1, 1);
  validarNumeroOpcional(mapa.ndviMinimo, 'El NDVI minimo', -1, 1);
  validarNumeroOpcional(mapa.ndviMaximo, 'El NDVI maximo', -1, 1);
  validarNumeroOpcional(mapa.ndviDesvio, 'El desvio NDVI', 0);
  validarNumeroOpcional(mapa.superficieAnalizadaHa, 'La superficie analizada', 0);

  if (mapa.ndviMinimo !== undefined && mapa.ndviMaximo !== undefined && mapa.ndviMinimo > mapa.ndviMaximo) {
    throw crearErrorValidacion('El NDVI minimo no puede ser mayor al maximo.');
  }
}

export function prepararMapaNdviParaGuardar(mapa: GuardarMapaNdviRequest['mapa'], ahora = Date.now()) {
  const fechaImagen = new Date(mapa.fechaImagen);
  const fechaProcesamiento = mapa.fechaProcesamiento ? new Date(mapa.fechaProcesamiento) : null;

  if (Number.isNaN(fechaImagen.getTime())) {
    throw crearErrorValidacion('La fecha de imagen NDVI no es valida.');
  }

  if (fechaImagen.getTime() > ahora) {
    throw crearErrorValidacion('La fecha de imagen NDVI no puede ser futura.');
  }

  if (fechaProcesamiento && Number.isNaN(fechaProcesamiento.getTime())) {
    throw crearErrorValidacion('La fecha de procesamiento NDVI no es valida.');
  }

  const proveedor = mapa.proveedor.trim();

  if (!proveedor) {
    throw crearErrorValidacion('El proveedor NDVI es obligatorio.');
  }

  if (!esOrigenMapaNdvi(mapa.origen)) {
    throw crearErrorValidacion('El origen NDVI no es valido.');
  }

  if (!esEstadoMapaNdvi(mapa.estado)) {
    throw crearErrorValidacion('El estado NDVI no es valido.');
  }

  validarRangosNdvi(mapa);

  return {
    mapa: {
      ...mapa,
      proveedor,
    },
    fechaImagen,
    fechaProcesamiento,
  };
}
