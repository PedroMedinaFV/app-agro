const test = require('node:test');
const assert = require('node:assert/strict');
const {
  construirUrl,
  construirUrlConQuery,
  crearHeadersAutenticacion,
  crearHeadersConToken,
  crearRespuestaVacia,
  deduplicarPorErpId,
  deduplicarZonasDeSnapshot,
  expandirPadronesSolicitados,
  extraerTokenLogin,
  leerErrorSeguro,
  obtenerIdEmpresaHeader,
} = require('../apps/api/dist/services/erp/clienteErp');

function configuracion(overrides = {}) {
  return {
    authMode: 'mock',
    apiKeyHeader: 'x-api-key',
    tokenHeader: 'Authorization',
    tokenPrefix: 'Bearer',
    timeoutMs: 15000,
    pageSize: 500,
    noPaginate: false,
    pathLogin: 'auth/login',
    ...overrides,
  };
}

test('expandirPadronesSolicitados agrega dependencias operativas de cultivos, lotes e insumos', () => {
  const seleccionados = expandirPadronesSolicitados(['cultivos', 'insumos']);

  assert.equal(seleccionados.has('cultivos'), true);
  assert.equal(seleccionados.has('campanias'), true);
  assert.equal(seleccionados.has('actividades'), true);
  assert.equal(seleccionados.has('especies'), true);
  assert.equal(seleccionados.has('lotes'), true);
  assert.equal(seleccionados.has('campos'), true);
  assert.equal(seleccionados.has('zonas'), true);
  assert.equal(seleccionados.has('unidadesMedida'), true);
  assert.equal(seleccionados.has('tiposInsumo'), true);
});

test('expandirPadronesSolicitados agrega unidades y tipos para servicios', () => {
  const seleccionados = expandirPadronesSolicitados(['servicios']);

  assert.deepEqual(
    Array.from(seleccionados).sort(),
    ['servicios', 'tiposServicio', 'unidadesMedida'].sort(),
  );
});

test('crearRespuestaVacia devuelve respuesta ERP exitosa sin registros', () => {
  assert.deepEqual(crearRespuestaVacia(), {
    succeeded: true,
    message: null,
    errors: [],
    pagination: {
      pageNumber: 1,
      pageSize: 0,
      totalPages: 1,
      totalRecords: 0,
    },
    data: [],
  });
});

test('construirUrl y construirUrlConQuery normalizan barras y query params', () => {
  assert.equal(construirUrl('https://erp.example.com/api///', '/Padrones/Campos'), 'https://erp.example.com/api/Padrones/Campos');

  const url = new URL(construirUrlConQuery('https://erp.example.com/api/', '/Padrones/Campos', {
    NoPaginate: false,
    PageNumber: 2,
    filtro: 'soja primera',
  }));

  assert.equal(url.toString(), 'https://erp.example.com/api/Padrones/Campos?NoPaginate=false&PageNumber=2&filtro=soja+primera');
});

test('crearHeadersAutenticacion arma headers para apiKey, bearer, basic y login', () => {
  assert.deepEqual(crearHeadersAutenticacion(configuracion({
    authMode: 'apiKey',
    apiKeyHeader: 'x-custom-key',
    apiKey: 'key-1',
  })), { 'x-custom-key': 'key-1' });

  assert.deepEqual(crearHeadersAutenticacion(configuracion({
    authMode: 'bearer',
    bearerToken: 'token-1',
  })), { Authorization: 'Bearer token-1' });

  assert.deepEqual(crearHeadersAutenticacion(configuracion({
    authMode: 'basic',
    username: 'usuario',
    password: 'clave',
  })), { Authorization: `Basic ${Buffer.from('usuario:clave').toString('base64')}` });

  assert.deepEqual(crearHeadersAutenticacion(configuracion({
    authMode: 'login',
    tokenHeader: 'x-session',
    tokenPrefix: '',
  }), 'token-login'), { 'x-session': 'token-login' });
});

test('crearHeadersConToken respeta prefijo configurable y obtenerIdEmpresaHeader remueve prefijo empresa', () => {
  assert.deepEqual(crearHeadersConToken(configuracion({
    tokenHeader: 'x-token',
    tokenPrefix: 'JWT',
  }), 'abc'), { 'x-token': 'JWT abc' });
  assert.deepEqual(crearHeadersConToken(configuracion({ tokenPrefix: '' }), 'abc'), { Authorization: 'abc' });
  assert.equal(obtenerIdEmpresaHeader('empresa:42'), '42');
  assert.equal(obtenerIdEmpresaHeader('global'), 'global');
});

test('extraerTokenLogin detecta tokens en respuesta plana o anidada y expiraEn valido', () => {
  const expiraEnIso = '2026-10-02T15:00:00.000Z';
  assert.deepEqual(extraerTokenLogin({ access_token: 'token-plano', expiresAt: expiraEnIso }), {
    token: 'token-plano',
    expiraEn: new Date(expiraEnIso).getTime(),
  });
  assert.deepEqual(extraerTokenLogin({ data: { accessToken: 'token-data', expirationTime: 'fecha-invalida' } }), {
    token: 'token-data',
    expiraEn: undefined,
  });
  assert.deepEqual(extraerTokenLogin(null), {});
});

test('leerErrorSeguro redacta secretos y limita detalle devuelto por ERP', async () => {
  const cuerpo = JSON.stringify({
    token: 'token-secreto',
    refreshToken: 'refresh-secreto',
    password: 'clave-secreta',
    detalle: 'x'.repeat(700),
  });

  const detalle = await leerErrorSeguro(new Response(cuerpo));

  assert.equal(detalle.includes('token-secreto'), false);
  assert.equal(detalle.includes('refresh-secreto'), false);
  assert.equal(detalle.includes('clave-secreta'), false);
  assert.equal(detalle.includes('"token":"<redactado>"'), true);
  assert.equal(detalle.length, 500);
});

test('deduplicarPorErpId conserva el primer registro y deduplicarZonasDeSnapshot solo zonas usadas', () => {
  assert.deepEqual(deduplicarPorErpId([
    { erpId: 'a', nombre: 'primero' },
    { erpId: 'b', nombre: 'segundo' },
    { erpId: 'a', nombre: 'duplicado' },
  ]), [
    { erpId: 'a', nombre: 'primero' },
    { erpId: 'b', nombre: 'segundo' },
  ]);

  assert.deepEqual(deduplicarZonasDeSnapshot([
    { idZona: 2, erpId: 'empresa:1:zona:2', empresaErpId: 'empresa:1', nombre: 'Zona B' },
    { idZona: 1, erpId: 'empresa:1:zona:1', empresaErpId: 'empresa:1', nombre: 'Zona A' },
    { idZona: 2, erpId: 'empresa:2:zona:2', empresaErpId: 'empresa:2', nombre: 'Zona B duplicada' },
    { idZona: 3, erpId: 'empresa:1:zona:3', empresaErpId: 'empresa:1', nombre: 'Zona sin campo' },
  ], [
    { idZona: 2 },
    { idZona: 1 },
  ]), [
    { idZona: 1, erpId: 'zona:1', empresaErpId: 'global', nombre: 'Zona A' },
    { idZona: 2, erpId: 'zona:2', empresaErpId: 'global', nombre: 'Zona B' },
  ]);
});
