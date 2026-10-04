const test = require('node:test');
const assert = require('node:assert/strict');

const {
  obtenerClientIdMicrosoft,
  validarIssuerMicrosoft,
  extraerIdentidadMicrosoft,
} = require('../apps/api/dist/services/microsoftIdentity');

test('obtenerClientIdMicrosoft exige client id configurado', () => {
  const original = process.env.MICROSOFT_CLIENT_ID;
  delete process.env.MICROSOFT_CLIENT_ID;

  assert.throws(
    () => obtenerClientIdMicrosoft(),
    /Falta MICROSOFT_CLIENT_ID/,
  );

  if (original === undefined) {
    delete process.env.MICROSOFT_CLIENT_ID;
  } else {
    process.env.MICROSOFT_CLIENT_ID = original;
  }
});

test('obtenerClientIdMicrosoft devuelve el client id del entorno', () => {
  const original = process.env.MICROSOFT_CLIENT_ID;
  process.env.MICROSOFT_CLIENT_ID = 'client-id-test';

  assert.equal(obtenerClientIdMicrosoft(), 'client-id-test');

  if (original === undefined) {
    delete process.env.MICROSOFT_CLIENT_ID;
  } else {
    process.env.MICROSOFT_CLIENT_ID = original;
  }
});

test('validarIssuerMicrosoft reemplaza tenant dinamico y rechaza issuer distinto', () => {
  const issuerConfig = 'https://login.microsoftonline.com/{tenantid}/v2.0';

  assert.equal(
    validarIssuerMicrosoft(issuerConfig, 'https://login.microsoftonline.com/tenant-1/v2.0', 'tenant-1'),
    true,
  );
  assert.equal(
    validarIssuerMicrosoft(issuerConfig, 'https://login.microsoftonline.com/otro-tenant/v2.0', 'tenant-1'),
    false,
  );
});

test('extraerIdentidadMicrosoft usa email, preferred_username o upn y conserva nombre', () => {
  assert.deepEqual(
    extraerIdentidadMicrosoft({
      tid: 'tenant-1',
      sub: 'sub-1',
      email: 'usuario@agroapp.local',
      name: 'Usuario Agro',
    }),
    {
      microsoftId: 'tenant-1:sub-1',
      email: 'usuario@agroapp.local',
      nombre: 'Usuario Agro',
    },
  );

  assert.equal(
    extraerIdentidadMicrosoft({ sub: 'sub-2', preferred_username: 'preferido@agroapp.local' }).email,
    'preferido@agroapp.local',
  );
  assert.equal(
    extraerIdentidadMicrosoft({ sub: 'sub-3', upn: 'upn@agroapp.local' }).email,
    'upn@agroapp.local',
  );
});

test('extraerIdentidadMicrosoft exige sub y email usable', () => {
  assert.throws(
    () => extraerIdentidadMicrosoft({ email: 'usuario@agroapp.local' }),
    /usuario o email/,
  );
  assert.throws(
    () => extraerIdentidadMicrosoft({ sub: 'sub-1' }),
    /usuario o email/,
  );
});
