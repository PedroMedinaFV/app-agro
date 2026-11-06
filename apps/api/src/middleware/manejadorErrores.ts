import { Request, Response, NextFunction } from 'express';

export function manejadorErrores(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'La solicitud supera el tamanio maximo permitido.',
      detalle: 'Reduce la cantidad de datos enviados o ajusta API_JSON_LIMIT de forma controlada.',
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo JSON no es valido.' });
  }

  const status = Number.isInteger(err?.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
    ? err.statusCode : 500;

  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ error: 'Error interno del servidor' });
  }

  const mensaje = typeof err?.message === 'string' ? err.message : 'La solicitud no es valida.';
  return res.status(status).json({ error: mensaje, detalle: mensaje });
}
