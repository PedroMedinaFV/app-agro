import { Request, Response, NextFunction } from 'express';

type RequestConUsuario = Request & { user?: { rol?: string } };

export function verificarRol(rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rol = (req as RequestConUsuario).user?.rol || 'usuario';

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
}
