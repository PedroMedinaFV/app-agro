import { IntegracionErpInput, IntegracionErpPublica } from '@agro/tipos';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../prisma';
import { cifrarSecreto, descifrarSecreto } from '../seguridad/cifradoSecretos';

export type ErpAuthMode = 'mock' | 'apiKey' | 'bearer' | 'basic';

export type ConfiguracionErp = {
  clienteId?: string;
  baseUrl?: string;
  authMode: ErpAuthMode;
  apiKey?: string;
  apiKeyHeader: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  timeoutMs: number;
  pageSize: number;
  noPaginate: boolean;
  pathZonas: string;
  pathCampos: string;
  pathLotes: string;
  pathActividades: string;
  pathEspecies: string;
  pathCampanias: string;
  pathCultivos: string;
  pathInsumos: string;
  pathEmpresas: string;
};

type IntegracionErpRow = {
  id: string;
  clienteId: string;
  baseUrl: string | null;
  authMode: string;
  apiKeyHeader: string;
  apiKeyCifrada: string | null;
  bearerTokenCifrado: string | null;
  usernameCifrado: string | null;
  passwordCifrada: string | null;
  timeoutMs: number;
  activo: boolean;
  ultimoTestOk: boolean | null;
  ultimoTestEn: Date | null;
  ultimoSyncEn: Date | null;
  updatedAt: Date;
};

function leerAuthMode(valor?: string): ErpAuthMode {
  if (valor === 'apiKey' || valor === 'bearer' || valor === 'basic') {
    return valor;
  }

  return 'mock';
}

export function obtenerConfiguracionErp(): ConfiguracionErp {
  return {
    baseUrl: process.env.ERP_BASE_URL || undefined,
    authMode: leerAuthMode(process.env.ERP_AUTH_MODE),
    apiKey: process.env.ERP_API_KEY || undefined,
    apiKeyHeader: process.env.ERP_API_KEY_HEADER || 'x-api-key',
    bearerToken: process.env.ERP_BEARER_TOKEN || undefined,
    username: process.env.ERP_USERNAME || undefined,
    password: process.env.ERP_PASSWORD || undefined,
    timeoutMs: Number(process.env.ERP_TIMEOUT_MS || 15000),
    pageSize: Number(process.env.ERP_PAGE_SIZE || 500),
    noPaginate: process.env.ERP_NO_PAGINATE === 'true',
    pathZonas: process.env.ERP_PATH_ZONAS || 'Padrones/Zonas',
    pathCampos: process.env.ERP_PATH_CAMPOS || 'Padrones/Campos',
    pathLotes: process.env.ERP_PATH_LOTES || 'Padrones/Lotes',
    pathActividades: process.env.ERP_PATH_ACTIVIDADES || 'Agricultura/Actividades',
    pathEspecies: process.env.ERP_PATH_ESPECIES || 'Agricultura/Especies',
    pathCampanias: process.env.ERP_PATH_CAMPANIAS || 'Agricultura/Campanias',
    pathCultivos: process.env.ERP_PATH_CULTIVOS || 'Agricultura/Cultivos',
    pathInsumos: process.env.ERP_PATH_INSUMOS || 'Padrones/Insumos',
    pathEmpresas: process.env.ERP_PATH_EMPRESAS || 'Sistema/Empresas',
  };
}

function mapearRowAPublica(row: IntegracionErpRow): IntegracionErpPublica {
  return {
    id: row.id,
    clienteId: row.clienteId,
    baseUrl: row.baseUrl || undefined,
    authMode: leerAuthMode(row.authMode),
    apiKeyHeader: row.apiKeyHeader,
    timeoutMs: row.timeoutMs,
    activo: row.activo,
    apiKeyConfigurada: Boolean(row.apiKeyCifrada),
    bearerTokenConfigurado: Boolean(row.bearerTokenCifrado),
    basicConfigurado: Boolean(row.usernameCifrado && row.passwordCifrada),
    ultimoTestOk: row.ultimoTestOk ?? undefined,
    ultimoTestEn: row.ultimoTestEn?.toISOString(),
    ultimoSyncEn: row.ultimoSyncEn?.toISOString(),
    actualizadoEn: row.updatedAt.toISOString(),
  };
}

function mapearRowAConfiguracion(row: IntegracionErpRow): ConfiguracionErp {
  return {
    clienteId: row.clienteId,
    baseUrl: row.baseUrl || undefined,
    authMode: leerAuthMode(row.authMode),
    apiKey: descifrarSecreto(row.apiKeyCifrada),
    apiKeyHeader: row.apiKeyHeader,
    bearerToken: descifrarSecreto(row.bearerTokenCifrado),
    username: descifrarSecreto(row.usernameCifrado),
    password: descifrarSecreto(row.passwordCifrada),
    timeoutMs: row.timeoutMs,
    pageSize: Number(process.env.ERP_PAGE_SIZE || 500),
    noPaginate: process.env.ERP_NO_PAGINATE === 'true',
    pathZonas: process.env.ERP_PATH_ZONAS || 'Padrones/Zonas',
    pathCampos: process.env.ERP_PATH_CAMPOS || 'Padrones/Campos',
    pathLotes: process.env.ERP_PATH_LOTES || 'Padrones/Lotes',
    pathActividades: process.env.ERP_PATH_ACTIVIDADES || 'Agricultura/Actividades',
    pathEspecies: process.env.ERP_PATH_ESPECIES || 'Agricultura/Especies',
    pathCampanias: process.env.ERP_PATH_CAMPANIAS || 'Agricultura/Campanias',
    pathCultivos: process.env.ERP_PATH_CULTIVOS || 'Agricultura/Cultivos',
    pathInsumos: process.env.ERP_PATH_INSUMOS || 'Padrones/Insumos',
    pathEmpresas: process.env.ERP_PATH_EMPRESAS || 'Sistema/Empresas',
  };
}

export async function obtenerIntegracionErpPublica(clienteId: string) {
  const rows = await prisma.$queryRaw<IntegracionErpRow[]>`
    SELECT * FROM "IntegracionErp"
    WHERE "clienteId" = ${clienteId}
    LIMIT 1
  `;

  return rows[0] ? mapearRowAPublica(rows[0]) : null;
}

export async function obtenerConfiguracionErpPorCliente(clienteId: string): Promise<ConfiguracionErp | null> {
  const rows = await prisma.$queryRaw<IntegracionErpRow[]>`
    SELECT * FROM "IntegracionErp"
    WHERE "clienteId" = ${clienteId} AND "activo" = true
    LIMIT 1
  `;

  return rows[0] ? mapearRowAConfiguracion(rows[0]) : null;
}

export async function guardarIntegracionErp(input: IntegracionErpInput, configuradoPor?: string) {
  const existente = await obtenerIntegracionErpPublica(input.clienteId);
  const id = existente?.id || randomUUID();
  const authMode = input.authMode || 'mock';
  const apiKeyHeader = input.apiKeyHeader || 'x-api-key';
  const timeoutMs = input.timeoutMs || 15000;
  const activo = input.activo ?? true;

  await prisma.$executeRaw`
    INSERT INTO "IntegracionErp" (
      "id", "clienteId", "baseUrl", "authMode", "apiKeyHeader", "apiKeyCifrada",
      "bearerTokenCifrado", "usernameCifrado", "passwordCifrada", "timeoutMs",
      "activo", "configuradoPor", "updatedAt"
    )
    VALUES (
      ${id}, ${input.clienteId}, ${input.baseUrl || null}, ${authMode}, ${apiKeyHeader}, ${cifrarSecreto(input.apiKey)},
      ${cifrarSecreto(input.bearerToken)}, ${cifrarSecreto(input.username)}, ${cifrarSecreto(input.password)}, ${timeoutMs},
      ${activo}, ${configuradoPor || null}, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("clienteId") DO UPDATE SET
      "baseUrl" = EXCLUDED."baseUrl",
      "authMode" = EXCLUDED."authMode",
      "apiKeyHeader" = EXCLUDED."apiKeyHeader",
      "apiKeyCifrada" = COALESCE(EXCLUDED."apiKeyCifrada", "IntegracionErp"."apiKeyCifrada"),
      "bearerTokenCifrado" = COALESCE(EXCLUDED."bearerTokenCifrado", "IntegracionErp"."bearerTokenCifrado"),
      "usernameCifrado" = COALESCE(EXCLUDED."usernameCifrado", "IntegracionErp"."usernameCifrado"),
      "passwordCifrada" = COALESCE(EXCLUDED."passwordCifrada", "IntegracionErp"."passwordCifrada"),
      "timeoutMs" = EXCLUDED."timeoutMs",
      "activo" = EXCLUDED."activo",
      "configuradoPor" = EXCLUDED."configuradoPor",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  return obtenerIntegracionErpPublica(input.clienteId);
}

export function validarConfiguracionErp(configuracion = obtenerConfiguracionErp()) {
  if (configuracion.authMode === 'mock') {
    return;
  }

  if (!configuracion.baseUrl) {
    throw new Error('Falta ERP_BASE_URL para conectar con la API del ERP.');
  }

  if (configuracion.authMode === 'apiKey' && !configuracion.apiKey) {
    throw new Error('Falta ERP_API_KEY para autenticar contra el ERP.');
  }

  if (configuracion.authMode === 'bearer' && !configuracion.bearerToken) {
    throw new Error('Falta ERP_BEARER_TOKEN para autenticar contra el ERP.');
  }

  if (configuracion.authMode === 'basic' && (!configuracion.username || !configuracion.password)) {
    throw new Error('Faltan ERP_USERNAME y ERP_PASSWORD para autenticar contra el ERP.');
  }
}
