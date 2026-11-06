export function obtenerDuracionBloqueoErp(env = process.env) {
  const valor = env.ERP_SYNC_LOCK_TTL_MS;
  const ttl = valor === undefined || valor === '' ? 300000 : Number(valor);
  if (!Number.isInteger(ttl) || ttl < 10000 || ttl > 3600000) {
    throw new Error('ERP_SYNC_LOCK_TTL_MS debe ser un entero entre 10000 y 3600000.');
  }
  return ttl;
}
