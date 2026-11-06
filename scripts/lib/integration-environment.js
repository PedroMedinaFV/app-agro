const fs = require('node:fs');
const path = require('node:path');

function cargarEntornoTesting(raiz, entorno = process.env) {
  const archivo = path.join(raiz, '.env.test.local');
  if (fs.existsSync(archivo)) {
    for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const match = linea.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
      if (match && entorno[match[1]] === undefined) entorno[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
  const conexion = entorno.TEST_DATABASE_URL;
  if (!conexion) throw new Error('Define TEST_DATABASE_URL en el entorno o .env.test.local. No se usa DATABASE_URL como fallback.');
  const url = new URL(conexion);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('TEST_DATABASE_URL debe ser PostgreSQL.');
  return conexion;
}

function validarSchemaTesting(schema) {
  if (!/^agro_integration_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema de testing no valido; se cancela la operacion.');
}

module.exports = { cargarEntornoTesting, validarSchemaTesting };
