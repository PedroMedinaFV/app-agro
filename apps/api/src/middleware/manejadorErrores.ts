import { Request, Response, NextFunction } from 'express';

export function manejadorErrores(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  res.status(err?.statusCode || 500).json({
    error: err?.statusCode ? err.message : 'Error interno del servidor',
    detalle: err?.message || 'Sin detalle',
  });
}
