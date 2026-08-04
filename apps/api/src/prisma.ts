import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

const memoriaUsuarios: Array<{ id: string; email: string; nombre?: string | null; password: string; rol?: string }> = [];

async function obtenerUsuarioPorEmail(email: string) {
  if (!process.env.DATABASE_URL) {
    return memoriaUsuarios.find((usuario) => usuario.email === email) || null;
  }

  return prisma.usuario.findUnique({ where: { email } });
}

async function crearUsuario(datos: { email: string; nombre?: string | null; password: string; rol?: string }) {
  if (!process.env.DATABASE_URL) {
    const nuevoUsuario = {
      id: `dev-${Date.now()}`,
      ...datos,
    };
    memoriaUsuarios.push(nuevoUsuario);
    return nuevoUsuario;
  }

  return prisma.usuario.create({ data: datos });
}

export { prisma, obtenerUsuarioPorEmail, crearUsuario };
