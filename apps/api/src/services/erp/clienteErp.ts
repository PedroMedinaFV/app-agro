import {
  ErpPadronActividad,
  ErpPadronCampania,
  ErpPadronCampo,
  ErpPadronCultivo,
  ErpPadronEmpresa,
  ErpPadronEspecie,
  ErpPadronInsumo,
  ErpPadronLote,
  ErpPadronServicio,
  ErpPadronUnidadMedida,
  ErpPadronZona,
  ErpRespuestaPaginada,
  ErpSnapshot,
} from '@agro/tipos';
import { ConfiguracionErp, obtenerConfiguracionErp, obtenerConfiguracionErpPorCliente, validarConfiguracionErp } from './configuracionErp';
import { mapearRespuestaAgriculturaActividades } from './mappers/agriculturaActividades';
import { mapearRespuestaAgriculturaCampanias } from './mappers/agriculturaCampanias';
import { mapearRespuestaAgriculturaCultivos } from './mappers/agriculturaCultivos';
import { mapearRespuestaAgriculturaEspecies } from './mappers/agriculturaEspecies';
import { mapearRespuestaPadronesCampos } from './mappers/padronesCampos';
import { mapearRespuestaPadronesInsumos } from './mappers/padronesInsumos';
import { mapearRespuestaPadronesLotes } from './mappers/padronesLotes';
import { mapearRespuestaPadronesServicios } from './mappers/padronesServicios';
import { mapearRespuestaPadronesUnidadesMedida } from './mappers/padronesUnidadesMedida';
import { mapearRespuestaPadronesZonas } from './mappers/padronesZonas';
import { mapearRespuestaSistemaEmpresas } from './mappers/sistemaEmpresas';
import { obtenerSnapshotErpMock } from './mockErp';
import { listarEmpresasErpCliente } from './empresasCliente';

let tokenLoginCache: { clave: string; token: string; expiraEn: number } | null = null;

function crearHeadersConToken(configuracion: ConfiguracionErp, token: string): Record<string, string> {
  const valor = configuracion.tokenPrefix ? `${configuracion.tokenPrefix} ${token}` : token;
  return { [configuracion.tokenHeader]: valor };
}

function crearHeadersAutenticacion(configuracion: ConfiguracionErp, tokenLogin?: string): Record<string, string> {
  if (configuracion.authMode === 'apiKey') {
    return { [configuracion.apiKeyHeader]: configuracion.apiKey || '' };
  }

  if (configuracion.authMode === 'bearer' && configuracion.bearerToken) {
    return { Authorization: `Bearer ${configuracion.bearerToken}` };
  }

  if (configuracion.authMode === 'login' && tokenLogin) {
    return crearHeadersConToken(configuracion, tokenLogin);
  }

  if (configuracion.authMode === 'basic') {
    const credenciales = Buffer.from(`${configuracion.username}:${configuracion.password}`).toString('base64');
    return { Authorization: `Basic ${credenciales}` };
  }

  return {};
}

function obtenerIdEmpresaHeader(empresaErpId: string) {
  return empresaErpId.replace(/^empresa:/, '');
}

async function fetchConTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function leerErrorSeguro(respuesta: Response) {
  const texto = await respuesta.text().catch(() => '');

  if (!texto) {
    return '';
  }

  return texto
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"<redactado>"')
    .replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"<redactado>"')
    .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"<redactado>"')
    .slice(0, 500);
}

function construirUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function construirUrlConQuery(baseUrl: string, path: string, query?: Record<string, string | number | boolean>) {
  const url = new URL(construirUrl(baseUrl, path));

  for (const [clave, valor] of Object.entries(query || {})) {
    url.searchParams.set(clave, String(valor));
  }

  return url.toString();
}

function extraerTokenLogin(body: unknown): { token?: string; expiraEn?: number } {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const registro = body as Record<string, unknown>;
  const data = registro.data as Record<string, unknown> | undefined;
  const candidatos = [
    registro.token,
    registro.accessToken,
    registro.access_token,
    registro.jwt,
    data?.token,
    data?.accessToken,
    data?.access_token,
  ];
  const expirationTime = data?.expirationTime || registro.expirationTime || data?.expiresAt || registro.expiresAt;
  const expiraEn = typeof expirationTime === 'string' ? new Date(expirationTime).getTime() : undefined;

  return {
    token: candidatos.find((valor): valor is string => typeof valor === 'string' && valor.length > 0),
    expiraEn: expiraEn && Number.isFinite(expiraEn) ? expiraEn : undefined,
  };
}

async function obtenerTokenLogin(configuracion: ConfiguracionErp) {
  if (configuracion.authMode !== 'login') {
    return undefined;
  }

  validarConfiguracionErp(configuracion);

  const claveCache = [
    configuracion.authBaseUrl,
    configuracion.loginKey,
    configuracion.loginApp,
    configuracion.loginInstallation,
  ].join('|');

  if (tokenLoginCache?.clave === claveCache && Date.now() < tokenLoginCache.expiraEn - 60 * 1000) {
    return tokenLoginCache.token;
  }

  const respuesta = await fetchConTimeout(construirUrl(configuracion.authBaseUrl as string, configuracion.pathLogin), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: configuracion.loginKey,
      password: configuracion.loginPassword,
      app: configuracion.loginApp,
      installation: configuracion.loginInstallation,
    }),
  }, configuracion.timeoutMs);

  if (!respuesta.ok) {
    const detalle = await leerErrorSeguro(respuesta);
    throw new Error(`ERP respondio ${respuesta.status} al autenticar en ${configuracion.pathLogin}.${detalle ? ` Detalle: ${detalle}` : ''}`);
  }

  const body = await respuesta.json();
  const { token, expiraEn } = extraerTokenLogin(body);

  if (!token) {
    throw new Error('El login del ERP respondio OK pero no se encontro un token en la respuesta.');
  }

  tokenLoginCache = {
    clave: claveCache,
    token,
    expiraEn: expiraEn || Date.now() + 10 * 60 * 1000,
  };
  return token;
}

async function getErp<T>(configuracion: ConfiguracionErp, path: string): Promise<T> {
  validarConfiguracionErp(configuracion);
  const tokenLogin = await obtenerTokenLogin(configuracion);

  const respuesta = await fetchConTimeout(construirUrl(configuracion.baseUrl as string, path), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...crearHeadersAutenticacion(configuracion, tokenLogin),
    },
  }, configuracion.timeoutMs);

  if (!respuesta.ok) {
    const detalle = await leerErrorSeguro(respuesta);
    throw new Error(`ERP respondio ${respuesta.status} al consultar ${path}.${detalle ? ` Detalle: ${detalle}` : ''}`);
  }

  return respuesta.json() as Promise<T>;
}

async function getErpConQuery<T>(
  configuracion: ConfiguracionErp,
  path: string,
  query?: Record<string, string | number | boolean>,
  empresaErpId?: string,
): Promise<T> {
  validarConfiguracionErp(configuracion);
  const tokenLogin = await obtenerTokenLogin(configuracion);

  const respuesta = await fetchConTimeout(construirUrlConQuery(configuracion.baseUrl as string, path, query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...crearHeadersAutenticacion(configuracion, tokenLogin),
      ...(empresaErpId ? { 'x-company': obtenerIdEmpresaHeader(empresaErpId) } : {}),
    },
  }, configuracion.timeoutMs);

  if (!respuesta.ok) {
    const detalle = await leerErrorSeguro(respuesta);
    throw new Error(`ERP respondio ${respuesta.status} al consultar ${path}.${detalle ? ` Detalle: ${detalle}` : ''}`);
  }

  return respuesta.json() as Promise<T>;
}

async function getErpPaginado<T>(
  configuracion: ConfiguracionErp,
  path: string,
  empresaErpId?: string,
): Promise<ErpRespuestaPaginada<T>> {
  if (configuracion.noPaginate) {
    return getErpConQuery<ErpRespuestaPaginada<T>>(configuracion, path, { NoPaginate: true }, empresaErpId);
  }

  const primeraPagina = await getErpConQuery<ErpRespuestaPaginada<T>>(configuracion, path, {
    NoPaginate: false,
    PageNumber: 1,
    PageSize: configuracion.pageSize,
  }, empresaErpId);

  if (!primeraPagina.succeeded || primeraPagina.pagination.totalPages <= 1) {
    return primeraPagina;
  }

  const paginasRestantes = await Promise.all(
    Array.from({ length: primeraPagina.pagination.totalPages - 1 }, (_, indice) => indice + 2).map((pageNumber) =>
      getErpConQuery<ErpRespuestaPaginada<T>>(configuracion, path, {
        NoPaginate: false,
        PageNumber: pageNumber,
        PageSize: configuracion.pageSize,
      }, empresaErpId),
    ),
  );

  return {
    ...primeraPagina,
    data: [primeraPagina, ...paginasRestantes].flatMap((pagina) => pagina.data),
  };
}

async function obtenerEmpresasAgro(clienteId: string | undefined, empresasImportadas: { erpId: string }[]) {
  if (!clienteId) {
    return empresasImportadas.map((empresa) => empresa.erpId);
  }

  const seleccionadas = await listarEmpresasErpCliente(clienteId);

  if (seleccionadas.length === 0) {
    throw new Error('No hay empresas ERP asociadas al cliente. Un admin debe seleccionar las empresas AGRO antes de sincronizar.');
  }

  return seleccionadas.map((seleccion) => seleccion.empresaErpId);
}

export async function resolverConfiguracionErp(clienteId?: string) {
  if (clienteId) {
    try {
      const configuracionDb = await obtenerConfiguracionErpPorCliente(clienteId);
      if (configuracionDb) {
        return configuracionDb;
      }
    } catch (error) {
      console.warn('No se pudo leer configuracion ERP desde DB. Se usara fallback de entorno.');
    }
  }

  return obtenerConfiguracionErp();
}

export async function obtenerSnapshotErp(clienteId?: string): Promise<ErpSnapshot> {
  const configuracion = await resolverConfiguracionErp(clienteId);

  if (configuracion.authMode === 'mock') {
    return obtenerSnapshotErpMock();
  }

  const empresas = await obtenerEmpresasSistemaErp(clienteId);
  const empresasAgro = await obtenerEmpresasAgro(clienteId, empresas);

  const snapshotsPorEmpresa = await Promise.all(
    empresasAgro.map(async (empresaErpId) => {
      const [respuestaZonas, respuestaCampos, respuestaLotes, respuestaActividades, respuestaEspecies, respuestaCampanias, respuestaCultivos, respuestaInsumos, respuestaServicios, respuestaUnidadesMedida] = await Promise.all([
        getErpPaginado<ErpPadronZona>(configuracion, configuracion.pathZonas, empresaErpId),
        getErpPaginado<ErpPadronCampo>(configuracion, configuracion.pathCampos, empresaErpId),
        getErpPaginado<ErpPadronLote>(configuracion, configuracion.pathLotes, empresaErpId),
        getErpPaginado<ErpPadronActividad>(configuracion, configuracion.pathActividades, empresaErpId),
        getErpPaginado<ErpPadronEspecie>(configuracion, configuracion.pathEspecies, empresaErpId),
        getErpPaginado<ErpPadronCampania>(configuracion, configuracion.pathCampanias, empresaErpId),
        getErpPaginado<ErpPadronCultivo>(configuracion, configuracion.pathCultivos, empresaErpId),
        getErpPaginado<ErpPadronInsumo>(configuracion, configuracion.pathInsumos, empresaErpId),
        getErpPaginado<ErpPadronServicio>(configuracion, configuracion.pathServicios, empresaErpId),
        getErpPaginado<ErpPadronUnidadMedida>(configuracion, configuracion.pathUnidadesMedida, empresaErpId),
      ]);

      return {
        zonas: mapearRespuestaPadronesZonas(respuestaZonas, empresaErpId),
        campos: mapearRespuestaPadronesCampos(respuestaCampos, empresaErpId),
        lotes: mapearRespuestaPadronesLotes(respuestaLotes, empresaErpId),
        actividades: mapearRespuestaAgriculturaActividades(respuestaActividades, empresaErpId),
        especies: mapearRespuestaAgriculturaEspecies(respuestaEspecies, empresaErpId),
        campanias: mapearRespuestaAgriculturaCampanias(respuestaCampanias, empresaErpId),
        cultivos: mapearRespuestaAgriculturaCultivos(respuestaCultivos, empresaErpId),
        insumos: mapearRespuestaPadronesInsumos(respuestaInsumos, empresaErpId),
        servicios: mapearRespuestaPadronesServicios(respuestaServicios, empresaErpId),
        unidadesMedida: mapearRespuestaPadronesUnidadesMedida(respuestaUnidadesMedida, empresaErpId),
      };
    }),
  );

  return {
    zonas: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.zonas),
    campos: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.campos),
    lotes: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.lotes),
    actividades: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.actividades),
    especies: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.especies),
    campanias: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.campanias),
    cultivos: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.cultivos),
    insumos: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.insumos),
    servicios: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.servicios),
    unidadesMedida: snapshotsPorEmpresa.flatMap((snapshot) => snapshot.unidadesMedida),
    empresas,
    sincronizadoEn: new Date().toISOString(),
  };
}

export async function obtenerEmpresasSistemaErp(clienteId?: string) {
  const configuracion = await resolverConfiguracionErp(clienteId);

  if (configuracion.authMode === 'mock') {
    return (await obtenerSnapshotErpMock()).empresas;
  }

  return mapearRespuestaSistemaEmpresas(
    await getErpPaginado<ErpPadronEmpresa>(configuracion, configuracion.pathEmpresas),
  );
}
