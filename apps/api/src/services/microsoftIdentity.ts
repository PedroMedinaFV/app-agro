import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

type OpenIdConfiguration = {
  issuer: string;
  jwks_uri: string;
};

type Jwk = {
  kid: string;
  kty: string;
  n?: string;
  e?: string;
  x5c?: string[];
};

type Jwks = {
  keys: Jwk[];
};

export type MicrosoftIdentity = {
  microsoftId: string;
  email: string;
  nombre?: string;
};

let configuracionCache: OpenIdConfiguration | null = null;
let jwksCache: Jwks | null = null;

function obtenerTenantId() {
  return process.env.MICROSOFT_TENANT_ID || 'common';
}

function obtenerClientId() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    throw new Error('Falta MICROSOFT_CLIENT_ID para validar login Microsoft.');
  }

  return clientId;
}

async function obtenerConfiguracion() {
  if (configuracionCache) {
    return configuracionCache;
  }

  const tenantId = obtenerTenantId();
  const respuesta = await fetch(`https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`);

  if (!respuesta.ok) {
    throw new Error('No se pudo obtener la configuracion OpenID de Microsoft.');
  }

  configuracionCache = (await respuesta.json()) as OpenIdConfiguration;
  return configuracionCache;
}

async function obtenerJwks() {
  if (jwksCache) {
    return jwksCache;
  }

  const configuracion = await obtenerConfiguracion();
  const respuesta = await fetch(configuracion.jwks_uri);

  if (!respuesta.ok) {
    throw new Error('No se pudieron obtener las claves publicas de Microsoft.');
  }

  jwksCache = (await respuesta.json()) as Jwks;
  return jwksCache;
}

function crearClavePublica(jwk: Jwk) {
  if (jwk.x5c?.[0]) {
    const certificado = [
      '-----BEGIN CERTIFICATE-----',
      jwk.x5c[0].match(/.{1,64}/g)?.join('\n'),
      '-----END CERTIFICATE-----',
    ].join('\n');

    return certificado;
  }

  return crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({
    format: 'pem',
    type: 'spki',
  }) as string;
}

function validarIssuer(issuerConfigurado: string, issuerToken: string, tenantToken?: string) {
  const issuerEsperado = issuerConfigurado.replace('{tenantid}', tenantToken || '');
  return issuerToken === issuerEsperado;
}

export async function validarIdTokenMicrosoft(idToken: string): Promise<MicrosoftIdentity> {
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Token Microsoft invalido.');
  }

  const kid = decoded.header.kid;
  const jwks = await obtenerJwks();
  const jwk = jwks.keys.find((clave) => clave.kid === kid);

  if (!jwk) {
    jwksCache = null;
    throw new Error('No se encontro la clave de firma del token Microsoft.');
  }

  const configuracion = await obtenerConfiguracion();
  const payload = jwt.verify(idToken, crearClavePublica(jwk), {
    algorithms: ['RS256'],
    audience: obtenerClientId(),
  }) as jwt.JwtPayload;

  if (!payload.iss || !validarIssuer(configuracion.issuer, payload.iss, payload.tid as string | undefined)) {
    throw new Error('Issuer Microsoft invalido.');
  }

  const email = (payload.email || payload.preferred_username || payload.upn) as string | undefined;

  if (!payload.sub || !email) {
    throw new Error('El token Microsoft no contiene usuario o email.');
  }

  return {
    microsoftId: `${payload.tid || 'common'}:${payload.sub}`,
    email,
    nombre: payload.name as string | undefined,
  };
}
