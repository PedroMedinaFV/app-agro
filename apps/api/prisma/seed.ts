import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

async function main() {
  const clienteId = process.env.SEED_CLIENTE_ID;
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!clienteId || !adminEmail || !adminPassword) {
    console.log('Seed sin datos iniciales. Define SEED_CLIENTE_ID, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear un administrador.');
    return;
  }

  const password = await bcrypt.hash(adminPassword, 10);
  const cliente = await prisma.cliente.upsert({
    where: { id: clienteId },
    update: { nombre: process.env.SEED_CLIENTE_NOMBRE || 'Cliente inicial', activo: true },
    create: { id: clienteId, nombre: process.env.SEED_CLIENTE_NOMBRE || 'Cliente inicial', activo: true },
  });

  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {
      clienteId: cliente.id,
      rol: 'admin',
      password,
    },
    create: {
      email: adminEmail,
      nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador',
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
