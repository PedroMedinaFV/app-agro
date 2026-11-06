import jwt from 'jsonwebtoken';
import { obtenerConfiguracionJwt } from '../../config/jwt';

export type UsuarioToken = {
  sub: string;
  email: string;
  rol?: string;
  clienteId?: string;
};

export function crearTokenSesion(usuario: { id: string; email: string; rol?: string; clienteId?: string | null }) {
  const config = obtenerConfiguracionJwt();
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol || 'operador_campo', clienteId: usuario.clienteId || undefined },
    config.secret,
    { algorithm: config.algorithm, expiresIn: config.expiresIn },
  );
}

export function verificarTokenSesion(token: string): UsuarioToken {
  const config = obtenerConfiguracionJwt();
  const payload = jwt.verify(token, config.secret, { algorithms: [config.algorithm] });

  if (typeof payload === 'string' || !payload.sub || typeof payload.sub !== 'string'
    || typeof payload.email !== 'string' || !payload.email.trim()
    || typeof payload.exp !== 'number'
    || (payload.rol !== undefined && typeof payload.rol !== 'string')
    || (payload.clienteId !== undefined && typeof payload.clienteId !== 'string')) {
    throw new Error('Token de sesion invalido.');
  }

  return { sub: payload.sub, email: payload.email, rol: payload.rol, clienteId: payload.clienteId };
}
