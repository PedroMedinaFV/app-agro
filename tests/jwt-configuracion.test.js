const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { validarConfiguracionJwt } = require('../apps/api/dist/config/jwt');

test('JWT exige clave explicita de al menos 32 bytes sin revelar el valor rechazado', () => {
  for (const secret of [undefined, '', ' '.repeat(40), 'secret-dev', 'agro-app-secret', 'x'.repeat(31)]) {
    assert.throws(() => validarConfiguracionJwt({ JWT_SECRET: secret }), {
      message: 'JWT_SECRET debe configurarse con al menos 32 bytes. Genera una clave aleatoria propia.',
    });
  }
  const config = validarConfiguracionJwt({ JWT_SECRET: 'clave-configuracion-test-32-bytes-minimum' });
  assert.equal(config.algorithm, 'HS256');
  assert.equal(config.expiresIn, '8h');
});

test('API no abre el puerto si JWT_SECRET esta vacio o es corto aunque exista .env local', () => {
  for (const secret of ['', 'clave-corta-no-publicar']) {
    const resultado = spawnSync(process.execPath, ['apps/api/dist/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: 'postgresql://test:test@localhost:5432/agro_test', JWT_SECRET: secret },
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ifError(resultado.error);
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /JWT_SECRET debe configurarse/);
    assert.doesNotMatch(resultado.stdout, /API ejecut/);
    if (secret) assert.ok(!resultado.stderr.includes(secret));
  }
});
