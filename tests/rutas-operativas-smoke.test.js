const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolverFichaLoteOperativo,
} = require('../apps/api/dist/routes/operativo');
const {
  resolverCrearUrlSubidaArchivoGeograficoLote,
  resolverGuardarArchivoGeograficoLote,
  resolverObtenerArchivosGeograficosLote,
} = require('../apps/api/dist/routes/lotesApp');
const {
  resolverGuardarMapaNdviLote,
  resolverObtenerMapaNdviPorId,
  resolverObtenerMapasNdviPorLote,
  resolverObtenerUltimoMapaNdviPorLote,
} = require('../apps/api/dist/routes/ndvi');

const usuario = {
  sub: 'usuario-1',
  email: 'user@test.com',
  rol: 'operador_campo',
  clienteId: 'cliente-1',
};

test('resolverFichaLoteOperativo pasa lote y usuario operativo al servicio', async () => {
  const llamadas = [];
  const ficha = { lote: { id: 'lote-1' }, generadoEn: '2026-10-05T00:00:00.000Z' };

  const respuesta = await resolverFichaLoteOperativo({
    params: { loteAppId: 'lote-1' },
    user: usuario,
  }, async (loteAppId, usuarioOperacion) => {
    llamadas.push({ loteAppId, usuarioOperacion });
    return ficha;
  });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body, ficha);
  assert.deepEqual(llamadas, [{
    loteAppId: 'lote-1',
    usuarioOperacion: {
      id: 'usuario-1',
      clienteId: 'cliente-1',
      rol: 'operador_campo',
    },
  }]);
});

test('resolverObtenerArchivosGeograficosLote exige cliente y delega listado', async () => {
  const sinCliente = await resolverObtenerArchivosGeograficosLote({
    params: { id: 'lote-1' },
    user: { sub: 'usuario-1' },
  }, async () => {
    throw new Error('No deberia consultar servicio sin cliente.');
  });

  assert.equal(sinCliente.status, 401);
  assert.deepEqual(sinCliente.body, { error: 'Sesion sin cliente asociado.' });

  const llamadas = [];
  const body = { archivos: [{ id: 'archivo-1' }] };
  const respuesta = await resolverObtenerArchivosGeograficosLote({
    params: { id: 'lote-1' },
    user: usuario,
  }, async (loteAppId, clienteId) => {
    llamadas.push({ loteAppId, clienteId });
    return body;
  });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body, body);
  assert.deepEqual(llamadas, [{ loteAppId: 'lote-1', clienteId: 'cliente-1' }]);
});

test('resolverCrearUrlSubidaArchivoGeograficoLote pasa body y usuario auditoria', async () => {
  const requestBody = {
    nombreArchivo: 'lote.kml',
    mimeType: 'text/xml',
    tamanioBytes: 1024,
  };
  const llamadas = [];
  const body = {
    storageBucket: 'lotes-geograficos',
    storagePath: 'cliente-1/lotes/lote-1/archivo.kml',
    signedUploadUrl: 'https://supabase.test/signed',
    expiresAt: '2026-10-05T12:00:00.000Z',
  };

  const respuesta = await resolverCrearUrlSubidaArchivoGeograficoLote({
    params: { id: 'lote-1' },
    body: requestBody,
    user: usuario,
  }, async (loteAppId, request, usuarioAuditoria) => {
    llamadas.push({ loteAppId, request, usuarioAuditoria });
    return body;
  });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body, body);
  assert.deepEqual(llamadas, [{
    loteAppId: 'lote-1',
    request: requestBody,
    usuarioAuditoria: {
      id: 'usuario-1',
      clienteId: 'cliente-1',
      email: 'user@test.com',
    },
  }]);
});

test('resolverGuardarArchivoGeograficoLote responde 201 y delega guardado', async () => {
  const requestBody = {
    origen: 'web',
    archivo: { id: 'archivo-1', nombreArchivo: 'lote.kml' },
  };
  const llamadas = [];
  const body = {
    archivo: { id: 'archivo-1' },
    auditado: true,
    mensaje: 'Archivo geografico vinculado al lote con auditoria.',
  };

  const respuesta = await resolverGuardarArchivoGeograficoLote({
    params: { id: 'lote-1' },
    body: requestBody,
    user: usuario,
  }, async (loteAppId, request, usuarioAuditoria) => {
    llamadas.push({ loteAppId, request, usuarioAuditoria });
    return body;
  });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body, body);
  assert.deepEqual(llamadas, [{
    loteAppId: 'lote-1',
    request: requestBody,
    usuarioAuditoria: {
      id: 'usuario-1',
      clienteId: 'cliente-1',
      email: 'user@test.com',
    },
  }]);
});

test('resolvers NDVI pasan usuario operativo y parametros correctos', async () => {
  const llamadas = [];
  const requestBody = { origen: 'web', mapa: { proveedor: 'Sentinel Hub' } };

  const guardar = await resolverGuardarMapaNdviLote({
    params: { loteAppId: 'lote-1' },
    body: requestBody,
    user: usuario,
  }, async (loteAppId, request, usuarioOperacion) => {
    llamadas.push({ metodo: 'guardar', loteAppId, request, usuarioOperacion });
    return { mapa: { id: 'mapa-1' }, auditado: true };
  });
  const historial = await resolverObtenerMapasNdviPorLote({
    params: { loteAppId: 'lote-1' },
    user: usuario,
  }, async (loteAppId, usuarioOperacion) => {
    llamadas.push({ metodo: 'historial', loteAppId, usuarioOperacion });
    return { loteAppId, historial: [] };
  });
  const ultimo = await resolverObtenerUltimoMapaNdviPorLote({
    params: { loteAppId: 'lote-1' },
    user: usuario,
  }, async (loteAppId, usuarioOperacion) => {
    llamadas.push({ metodo: 'ultimo', loteAppId, usuarioOperacion });
    return { id: 'mapa-ultimo' };
  });
  const porId = await resolverObtenerMapaNdviPorId({
    params: { mapaNdviId: 'mapa-1' },
    user: usuario,
  }, async (mapaNdviId, usuarioOperacion) => {
    llamadas.push({ metodo: 'por-id', mapaNdviId, usuarioOperacion });
    return { id: mapaNdviId };
  });

  assert.equal(guardar.status, 201);
  assert.equal(historial.status, 200);
  assert.equal(ultimo.status, 200);
  assert.equal(porId.status, 200);
  assert.deepEqual(llamadas, [
    {
      metodo: 'guardar',
      loteAppId: 'lote-1',
      request: requestBody,
      usuarioOperacion: {
        id: 'usuario-1',
        email: 'user@test.com',
        clienteId: 'cliente-1',
        rol: 'operador_campo',
      },
    },
    {
      metodo: 'historial',
      loteAppId: 'lote-1',
      usuarioOperacion: {
        id: 'usuario-1',
        email: 'user@test.com',
        clienteId: 'cliente-1',
        rol: 'operador_campo',
      },
    },
    {
      metodo: 'ultimo',
      loteAppId: 'lote-1',
      usuarioOperacion: {
        id: 'usuario-1',
        email: 'user@test.com',
        clienteId: 'cliente-1',
        rol: 'operador_campo',
      },
    },
    {
      metodo: 'por-id',
      mapaNdviId: 'mapa-1',
      usuarioOperacion: {
        id: 'usuario-1',
        email: 'user@test.com',
        clienteId: 'cliente-1',
        rol: 'operador_campo',
      },
    },
  ]);
});
