type EntornoJwt = { JWT_SECRET?: string };

export function validarConfiguracionJwt(entorno: EntornoJwt) {
  const secret = entorno.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret.trim(), 'utf8') < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 bytes. Genera una clave aleatoria propia.');
  }

  return { secret, algorithm: 'HS256' as const, expiresIn: '8h' as const };
}

export function obtenerConfiguracionJwt() {
  return validarConfiguracionJwt(process.env);
}
