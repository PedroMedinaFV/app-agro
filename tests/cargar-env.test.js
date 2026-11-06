const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cargarEnvRaiz } = require('../apps/api/dist/config/cargarEnvRaiz');

test('cargarEnvRaiz completa ausentes y respeta valores de proceso incluso vacios', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'agro-env-test-'));
  const archivo = path.join(carpeta, '.env');
  const clave = 'AGRO_TEST_ENV_PRIORITY';
  const anterior = process.env[clave];
  fs.writeFileSync(archivo, `${clave}="valor-del-archivo"\n`);
  try {
    for (const existente of ['valor-del-proceso', '']) {
      process.env[clave] = existente;
      cargarEnvRaiz(carpeta);
      assert.equal(process.env[clave], existente);
    }
    delete process.env[clave];
    cargarEnvRaiz(carpeta);
    assert.equal(process.env[clave], 'valor-del-archivo');
  } finally {
    if (anterior === undefined) delete process.env[clave];
    else process.env[clave] = anterior;
    fs.unlinkSync(archivo);
    fs.rmdirSync(carpeta);
  }
});
