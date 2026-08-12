import { Request, Response, NextFunction } from 'express';
import { Permiso, tienePermiso } from '@agro/tipos';

type RequestConUsuario = Request & { user?: { rol?: string } };

export function requierePermiso(permiso: Permiso) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rol = (req as RequestConUsuario).user?.rol || 'usuario';

    if (!tienePermiso(rol, permiso)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion' });
    }

    next();
  };
}
