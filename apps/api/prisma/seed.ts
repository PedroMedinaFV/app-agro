import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

async function main() {
  const password = await bcrypt.hash('demo1234', 10);
  const cliente = await prisma.cliente.upsert({
    where: { id: 'cliente-demo' },
    update: { nombre: 'Cliente Demo', activo: true },
    create: { id: 'cliente-demo', nombre: 'Cliente Demo', activo: true },
  });

  await prisma.usuario.upsert({
    where: { email: 'demo@agroapp.local' },
    update: {
      clienteId: cliente.id,
      rol: 'admin',
    },
    create: {
      email: 'demo@agroapp.local',
      nombre: 'Usuario Demo',
      password,
      rol: 'admin',
      clienteId: cliente.id,
    },
  });
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
