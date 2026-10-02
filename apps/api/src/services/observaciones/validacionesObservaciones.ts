import type { CrearAdjuntoObservacionInput, CrearObservacionRequest } from '@agro/tipos';

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function obtenerConfiguracionAdjuntos() {
  return {
    bucketDefault: process.env.OBSERVACION_ADJUNTO_BUCKET || 'observaciones',
    maxCantidad: Number(process.env.OBSERVACION_ADJUNTO_MAX_CANTIDAD || 5),
    maxBytes: Number(process.env.OBSERVACION_ADJUNTO_MAX_BYTES || 10 * 1024 * 1024),
  };
}

export function validarCoordenada(valor: number | undefined, minimo: number, maximo: number, nombre: string) {
  if (valor === undefined) {
    return;
  }

  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw crearErrorValidacion(`${nombre} no es valida.`);
  }
}

export function validarDatosBasicosObservacion(request: CrearObservacionRequest) {
  if (!['web', 'mobile', 'api'].includes(request.origen)) {
    throw crearErrorValidacion('El origen de la observacion no es valido.');
  }

  if (!request.campoAppId) {
    throw crearErrorValidacion('La observacion debe tener campo.');
  }

  const titulo = limpiarTextoVisible(request.titulo);
  if (!titulo) {
    throw crearErrorValidacion('La observacion debe tener titulo.');
  }

  const descripcion = limpiarTextoVisible(request.descripcion);
  if (!descripcion) {
    throw crearErrorValidacion('La observacion debe tener descripcion.');
  }

  if (request.severidad && !['baja', 'media', 'alta'].includes(request.severidad)) {
    throw crearErrorValidacion('La severidad de la observacion no es valida.');
  }

  validarCoordenada(request.latitud, -90, 90, 'La latitud');
  validarCoordenada(request.longitud, -180, 180, 'La longitud');

  if ((request.latitud === undefined) !== (request.longitud === undefined)) {
    throw crearErrorValidacion('Latitud y longitud deben informarse juntas.');
  }

  const fechaEvento = new Date(request.fechaEvento);
  if (Number.isNaN(fechaEvento.getTime())) {
    throw crearErrorValidacion('La fecha del evento no es valida.');
  }

  return {
    titulo,
    descripcion,
    severidad: request.severidad || 'media',
    fechaEvento,
  };
}

export function validarAdjuntosObservacion(request: CrearAdjuntoObservacionInput[] | undefined) {
  const { bucketDefault, maxCantidad, maxBytes } = obtenerConfiguracionAdjuntos();
  const mimePermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  const adjuntos = request || [];

  if (adjuntos.length > maxCantidad) {
    throw crearErrorValidacion(`Una observacion puede tener hasta ${maxCantidad} adjunto(s).`);
  }

  return adjuntos.map((adjunto) => {
    const storageBucket = limpiarTextoVisible(adjunto.storageBucket || bucketDefault);
    const storagePath = adjunto.storagePath.trim();
    const nombreArchivo = limpiarTextoVisible(adjunto.nombreArchivo);
    const mimeType = adjunto.mimeType.trim().toLowerCase();
    const estado = adjunto.estado || 'disponible';

    if (!storageBucket || storageBucket.includes('/') || storageBucket.includes('\\')) {
      throw crearErrorValidacion('El bucket del adjunto no es valido.');
    }

    if (
      !storagePath ||
      storagePath.startsWith('/') ||
      storagePath.includes('..') ||
      storagePath.includes('\\') ||
      !/^[a-zA-Z0-9/_\-.]+$/.test(storagePath)
    ) {
      throw crearErrorValidacion('La ruta de storage del adjunto no es valida.');
    }

    if (!nombreArchivo || nombreArchivo.length > 160) {
      throw crearErrorValidacion('El nombre del adjunto no es valido.');
    }

    if (!mimePermitidos.has(mimeType)) {
      throw crearErrorValidacion('El tipo de archivo del adjunto no esta permitido.');
    }

    if (!Number.isInteger(adjunto.tamanioBytes) || adjunto.tamanioBytes <= 0 || adjunto.tamanioBytes > maxBytes) {
      throw crearErrorValidacion(`El adjunto supera el limite permitido de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }

    if (adjunto.checksumSha256 && !/^[a-fA-F0-9]{64}$/.test(adjunto.checksumSha256)) {
      throw crearErrorValidacion('El checksum del adjunto no es valido.');
    }

    if (!['pendiente_subida', 'disponible', 'rechazado'].includes(estado)) {
      throw crearErrorValidacion('El estado del adjunto no es valido.');
    }

    return {
      storageBucket,
      storagePath,
      nombreArchivo,
      mimeType,
      tamanioBytes: adjunto.tamanioBytes,
      checksumSha256: adjunto.checksumSha256 || null,
      estado,
    };
  });
}
