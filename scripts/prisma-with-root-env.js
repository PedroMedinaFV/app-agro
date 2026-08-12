const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const envPath = resolve(__dirname, '../.env');

if (existsSync(envPath)) {
  const contenido = readFileSync(envPath, 'utf8');

  for (const linea of contenido.split(/\r?\n/)) {
    const match = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) {
      continue;
    }

    const clave = match[1];
    const valor = (match[2] || '').replace(/^["']|["']$/g, '');

    if (!process.env[clave]) {
      process.env[clave] = valor;
    }
  }
}

const resultado = spawnSync('prisma', process.argv.slice(2), {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(resultado.status || 0);
