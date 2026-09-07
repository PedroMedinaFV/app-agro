import { Request, Response, NextFunction } from 'express';

export function manejadorErrores(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'La solicitud supera el tamanio maximo permitido.',
      detalle: 'Reduce la cantidad de datos enviados o ajusta API_JSON_LIMIT de forma controlada.',
    });
  }

  res.status(err?.statusCode || 500).json({
    error: err?.statusCode ? err.message : 'Error interno del servidor',
    detalle: err?.message || 'Sin detalle',
  });
}
