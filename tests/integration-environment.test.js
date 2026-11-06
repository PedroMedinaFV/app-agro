const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cargarEntornoTesting, validarSchemaTesting } = require('../scripts/lib/integration-environment');

test('integracion exige conexion explicita, sin fallback operativo, y conserva prioridad del proceso', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'agro-integration-env-'));
  const archivo = path.join(carpeta, '.env.test.local');
  try {
    assert.throws(() => cargarEntornoTesting(carpeta, { DATABASE_URL: 'postgresql://test@localhost/dev' }), /No se usa DATABASE_URL/);
    fs.writeFileSync(archivo, 'TEST_DATABASE_URL="postgresql://test@localhost/testing"\n');
    assert.equal(cargarEntornoTesting(carpeta, {}), 'postgresql://test@localhost/testing');
    assert.throws(() => cargarEntornoTesting(carpeta, { TEST_DATABASE_URL: '' }), /Define TEST_DATABASE_URL/);
    assert.throws(() => cargarEntornoTesting(carpeta, { TEST_DATABASE_URL: 'https://example.test' }), /PostgreSQL/);
  } finally {
    if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
    fs.rmdirSync(carpeta);
  }
});

test('integracion solo permite schemas propios con identificador aleatorio completo', () => {
  for (const schema of ['agro_app', 'public', '', 'agro_integration_test_', 'agro_integration_test_abc; DROP SCHEMA public']) {
    assert.throws(() => validarSchemaTesting(schema));
  }
  assert.doesNotThrow(() => validarSchemaTesting('agro_integration_test_' + 'a'.repeat(32)));
});
