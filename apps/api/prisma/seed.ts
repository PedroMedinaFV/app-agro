import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

async function main() {
  const password = await bcrypt.hash('demo1234', 10);
  const cliente = await prisma.cliente.upsert({
    where: { id: 'cliente-demo' },
    update: { nombre: 'Cliente Demo', activo: true },
    create: { id: 'cliente-demo', nombre: 'Cliente Demo', activo: true },
  });

  const usuario = await prisma.usuario.upsert({
    where: { email: 'demo@agroapp.local' },
    update: { clienteId: cliente.id },
    create: {
      email: 'demo@agroapp.local',
      nombre: 'Usuario Demo',
      password,
      rol: 'admin',
      clienteId: cliente.id,
    },
  });

  const argentina = await prisma.pais.upsert({
    where: { codigo: 'AR' },
    update: { nombre: 'Argentina' },
    create: { codigo: 'AR', nombre: 'Argentina' },
  });

  const soja =
    (await prisma.cultivo.findFirst({ where: { nombre: 'Soja' } })) ||
    (await prisma.cultivo.create({
      data: { nombre: 'Soja' },
    }));

  const campo =
    (await prisma.campo.findFirst({ where: { nombre: 'Campo Demo', usuarioId: usuario.id } })) ||
    (await prisma.campo.create({
      data: {
        nombre: 'Campo Demo',
        paisId: argentina.id,
        usuarioId: usuario.id,
      },
    }));

  const loteExistente = await prisma.lote.findFirst({
    where: { nombre: 'Lote 1', campoId: campo.id },
  });

  if (!loteExistente) {
    await prisma.lote.create({
      data: {
        nombre: 'Lote 1',
        area: 120,
        tipoSemilla: 'Primera',
        campoId: campo.id,
        cultivoId: soja.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
