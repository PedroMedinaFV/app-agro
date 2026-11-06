import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 no propaga automaticamente rechazos de handlers async al middleware de errores.
export function rutaAsincrona(handler: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve().then(() => handler(req, res, next)).catch(next);
  };
}
