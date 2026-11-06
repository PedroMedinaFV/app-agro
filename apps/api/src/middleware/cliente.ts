import type { RequestHandler } from 'express';
import { validarClienteSesion } from '../services/seguridad/alcanceCliente';

export const requiereClienteRuta: RequestHandler = (req, res, next) => {
  try {
    validarClienteSesion(req.params.clienteId, (req as typeof req & { user?: { clienteId?: string } }).user);
    next();
  } catch (error) { next(error); }
};
