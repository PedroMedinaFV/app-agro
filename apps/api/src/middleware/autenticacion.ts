import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type UsuarioAutenticado = {
  sub: string;
  email: string;
  rol?: string;
  clienteId?: string;
};

type RequestConUsuario = Request & { user?: UsuarioAutenticado };

const SECRET = process.env.JWT_SECRET || 'secret-dev';

export function autenticacionBasica(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, SECRET) as UsuarioAutenticado;
    (req as RequestConUsuario).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
