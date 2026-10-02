const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cifrarSecreto,
  descifrarSecreto,
} = require('../apps/api/dist/services/seguridad/cifradoSecretos');
const {
  obtenerConfiguracionErp,
  validarConfiguracionErp,
} = require('../apps/api/dist/services/erp/configuracionErp');

const ERP_ENV_KEYS = [
  'ERP_BASE_URL',
  'ERP_AUTH_BASE_URL',
  'ERP_AUTH_MODE',
  'ERP_API_KEY',
  'ERP_API_KEY_HEADER',
  'ERP_BEARER_TOKEN',
  'ERP_USERNAME',
  'ERP_PASSWORD',
  'ERP_LOGIN_KEY',
  'ERP_LOGIN_PASSWORD',
  'ERP_LOGIN_APP',
  'ERP_LOGIN_INSTALLATION',
  'ERP_TOKEN_HEADER',
  'ERP_TOKEN_PREFIX',
  'ERP_TIMEOUT_MS',
  'ERP_PAGE_SIZE',
  'ERP_NO_PAGINATE',
  'ERP_PATH_ZONAS',
  'ERP_PATH_LOGIN',
  'SECRETS_ENCRYPTION_KEY',
  'JWT_SECRET',
];

function conEnvTemporal(valores, fn) {
  const anteriores = new Map(ERP_ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ERP_ENV_KEYS) {
    delete process.env[key];
  }

  Object.assign(process.env, valores);

  try {
    return fn();
  } finally {
    for (const key of ERP_ENV_KEYS) {
      const valor = anteriores.get(key);
      if (valor === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = valor;
      }
    }
  }
}

test('cifrarSecreto no persiste texto plano y descifra con la misma clave', () => {
  conEnvTemporal({ SECRETS_ENCRYPTION_KEY: 'clave-test' }, () => {
    const cifrado = cifrarSecreto('api-key-super-secreta');

    assert.ok(cifrado);
    assert.notEqual(cifrado, 'api-key-super-secreta');
    assert.equal(cifrado.split(':').length, 3);
    assert.equal(descifrarSecreto(cifrado), 'api-key-super-secreta');
  });
});

test('descifrarSecreto rechaza formato invalido y entradas vacias', () => {
  assert.equal(cifrarSecreto(''), null);
  assert.equal(cifrarSecreto(null), null);
  assert.equal(descifrarSecreto(''), undefined);
  assert.equal(descifrarSecreto(undefined), undefined);
  assert.throws(() => descifrarSecreto('sin-formato'), /Formato de secreto cifrado invalido/);
});

test('obtenerConfiguracionErp normaliza defaults y lee overrides de entorno', () => {
  conEnvTemporal({
    ERP_AUTH_MODE: 'bearer',
    ERP_BASE_URL: 'https://erp.example.com/api',
    ERP_BEARER_TOKEN: 'token-test',
    ERP_TOKEN_HEADER: 'x-token',
    ERP_TOKEN_PREFIX: '',
    ERP_TIMEOUT_MS: '2500',
    ERP_PAGE_SIZE: '25',
    ERP_NO_PAGINATE: 'true',
    ERP_PATH_ZONAS: '/zonas',
  }, () => {
    const configuracion = obtenerConfiguracionErp();

    assert.equal(configuracion.authMode, 'bearer');
    assert.equal(configuracion.baseUrl, 'https://erp.example.com/api');
    assert.equal(configuracion.authBaseUrl, 'https://erp.example.com/api');
    assert.equal(configuracion.bearerToken, 'token-test');
    assert.equal(configuracion.apiKeyHeader, 'x-api-key');
    assert.equal(configuracion.tokenHeader, 'x-token');
    assert.equal(configuracion.tokenPrefix, '');
    assert.equal(configuracion.timeoutMs, 2500);
    assert.equal(configuracion.pageSize, 25);
    assert.equal(configuracion.noPaginate, true);
    assert.equal(configuracion.pathZonas, '/zonas');
  });
});

test('obtenerConfiguracionErp cae a mock ante authMode desconocido', () => {
  conEnvTemporal({ ERP_AUTH_MODE: 'oauth' }, () => {
    assert.equal(obtenerConfiguracionErp().authMode, 'mock');
  });
});

test('validarConfiguracionErp permite mock y exige baseUrl para modos reales', () => {
  assert.doesNotThrow(() => validarConfiguracionErp({ authMode: 'mock' }));
  assert.throws(
    () => validarConfiguracionErp({ authMode: 'apiKey', apiKey: 'key' }),
    /Falta ERP_BASE_URL/,
  );
});

test('validarConfiguracionErp exige credenciales segun modo de autenticacion', () => {
  const base = {
    baseUrl: 'https://erp.example.com/api',
    authBaseUrl: 'https://erp.example.com/auth',
    apiKeyHeader: 'x-api-key',
    tokenHeader: 'Authorization',
    tokenPrefix: 'Bearer',
    timeoutMs: 15000,
    pageSize: 500,
    noPaginate: false,
  };

  assert.throws(() => validarConfiguracionErp({ ...base, authMode: 'apiKey' }), /ERP_API_KEY/);
  assert.throws(() => validarConfiguracionErp({ ...base, authMode: 'bearer' }), /ERP_BEARER_TOKEN/);
  assert.throws(() => validarConfiguracionErp({ ...base, authMode: 'basic', username: 'user' }), /ERP_USERNAME y ERP_PASSWORD/);
  assert.throws(() => validarConfiguracionErp({ ...base, authMode: 'login', loginKey: 'key', loginPassword: 'pass', loginApp: 'app' }), /ERP_LOGIN_KEY/);

  assert.doesNotThrow(() => validarConfiguracionErp({ ...base, authMode: 'apiKey', apiKey: 'key' }));
  assert.doesNotThrow(() => validarConfiguracionErp({ ...base, authMode: 'bearer', bearerToken: 'token' }));
  assert.doesNotThrow(() => validarConfiguracionErp({ ...base, authMode: 'basic', username: 'user', password: 'pass' }));
  assert.doesNotThrow(() => validarConfiguracionErp({
    ...base,
    authMode: 'login',
    loginKey: 'key',
    loginPassword: 'pass',
    loginApp: 'app',
    loginInstallation: 'instalacion',
  }));
});
