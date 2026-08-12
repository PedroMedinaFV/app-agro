import crypto from 'node:crypto';

const ALGORITMO = 'aes-256-gcm';

function obtenerClave() {
  const material = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-secret-change-me';
  return crypto.createHash('sha256').update(material).digest();
}

export function cifrarSecreto(valor?: string | null) {
  if (!valor) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(valor, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${cifrado.toString('base64')}`;
}

export function descifrarSecreto(valor?: string | null) {
  if (!valor) {
    return undefined;
  }

  const [ivBase64, tagBase64, cifradoBase64] = valor.split(':');

  if (!ivBase64 || !tagBase64 || !cifradoBase64) {
    throw new Error('Formato de secreto cifrado invalido.');
  }

  const decipher = crypto.createDecipheriv(ALGORITMO, obtenerClave(), Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(cifradoBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
