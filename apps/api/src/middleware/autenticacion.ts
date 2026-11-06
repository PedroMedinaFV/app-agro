import { Request, Response, NextFunction } from 'express';
import { verificarTokenSesion, type UsuarioToken } from '../services/seguridad/sesionJwt';

type RequestConUsuario = Request & { user?: UsuarioToken };

export function autenticacionBasica(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verificarTokenSesion(token);
    (req as RequestConUsuario).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
