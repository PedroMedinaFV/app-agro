import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

function cargarEnvRaiz() {
  const envPath = path.resolve(__dirname, '../../../.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contenido = fs.readFileSync(envPath, 'utf8');

  for (const linea of contenido.split(/\r?\n/)) {
    const match = linea.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) {
      continue;
    }

    const clave = match[1];
    const valor = (match[2] || '').replace(/^["']|["']$/g, '');

    process.env[clave] = valor;
  }
}

cargarEnvRaiz();

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia .env.example a .env y configura la base PostgreSQL.');
}

const prisma = new PrismaClient({
  log: ['error'],
});

async function obtenerUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email } });
}

async function crearUsuario(datos: { email: string; nombre?: string | null; password?: string | null; rol?: string }) {
  return prisma.usuario.create({ data: datos });
}

export { prisma, obtenerUsuarioPorEmail, crearUsuario };
