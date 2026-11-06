const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

/** Ejecuta el CLI local sin shell. El entorno del proceso prevalece sobre .env. */
function ejecutarPrisma(args, opciones = {}) {
  const envPath = opciones.envPath || resolve(__dirname, '../.env');
  const entorno = { ...(opciones.entorno || process.env) };
  const ejecutar = opciones.spawnSync || spawnSync;
  if (existsSync(envPath)) {
    const contenido = readFileSync(envPath, 'utf8');

    for (const linea of contenido.split(/\r?\n/)) {
      const match = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const clave = match[1];
      const valor = (match[2] || '').replace(/^["']|["']$/g, '');
      if (entorno[clave] === undefined) entorno[clave] = valor;
    }
  }

  const resultado = ejecutar(process.execPath, [resolve(__dirname, '../apps/api/node_modules/prisma/build/index.js'), ...args], {
    cwd: resolve(__dirname, '../apps/api'),
    stdio: 'inherit',
    shell: false,
    env: entorno,
  });
  if (resultado.error) {
    // No imprimir argumentos ni entorno: pueden contener credenciales.
    (opciones.informarError || console.error)('No se pudo iniciar el CLI local de Prisma. Verificar instalacion y permisos.');
    return 1;
  }
  return resultado.status ?? 1;
}

module.exports = { ejecutarPrisma };
if (require.main === module) process.exitCode = ejecutarPrisma(process.argv.slice(2));
