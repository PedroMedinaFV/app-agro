import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { cargarEnvRaiz } from './config/cargarEnvRaiz';
import { clienteConContextoErp } from './services/erp/contextoTransaccional';

cargarEnvRaiz(path.resolve(__dirname, '../../../'));

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia .env.example a .env y configura la base PostgreSQL.');
}

const prisma = clienteConContextoErp(new PrismaClient({
  log: ['error'],
}));

async function obtenerUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email } });
}

async function crearUsuario(datos: { email: string; nombre?: string | null; password?: string | null; rol?: string }) {
  return prisma.usuario.create({ data: datos });
}

export { prisma, obtenerUsuarioPorEmail, crearUsuario };
