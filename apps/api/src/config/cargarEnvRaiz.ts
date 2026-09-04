import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function buscarEnvRaiz(desde: string) {
  let directorioActual = resolve(desde);

  for (let nivel = 0; nivel < 6; nivel += 1) {
    const candidato = join(directorioActual, '.env');

    if (existsSync(candidato)) {
      return candidato;
    }

    const siguiente = dirname(directorioActual);

    if (siguiente === directorioActual) {
      return undefined;
    }

    directorioActual = siguiente;
  }

  return undefined;
}

export function cargarEnvRaiz() {
  const envPath = buscarEnvRaiz(process.cwd());

  if (!envPath) {
    return;
  }

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
