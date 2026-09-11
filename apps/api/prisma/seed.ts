import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

function normalizarTexto(valor: string) {
  return valor.trim().replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

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

  const conceptosGastosComerciales = [
    { id: 'concepto-gasto-flete', codigo: 'FLETE', nombre: 'Flete', unidadCalculo: 'Tn', descripcion: 'Transporte de cereal' },
    { id: 'concepto-gasto-acondicionamiento', codigo: 'ACOND', nombre: 'Acondicionamiento', unidadCalculo: 'Tn', descripcion: 'Secado, zarandeo o acondicionamiento comercial' },
    { id: 'concepto-gasto-comision', codigo: 'COM', nombre: 'Comision comercial', unidadCalculo: 'Tn', descripcion: 'Comision o intermediacion comercial' },
    { id: 'concepto-gasto-secada', codigo: 'SEC', nombre: 'Secada', unidadCalculo: 'Tn', descripcion: 'Secada o merma comercial' },
    { id: 'concepto-gasto-puerto-acopio', codigo: 'PYA', nombre: 'Puerto / acopio', unidadCalculo: 'Tn', descripcion: 'Gastos de puerto, acopio o planta' },
    { id: 'concepto-gasto-otros', codigo: 'OTROS', nombre: 'Otros gastos de venta', unidadCalculo: 'Tn', descripcion: 'Concepto general para gastos comerciales no clasificados' },
  ];

  for (const concepto of conceptosGastosComerciales) {
    await prisma.conceptoGastoComercialApp.upsert({
      where: { id: concepto.id },
      update: {
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        nombreNormalizado: normalizarTexto(concepto.nombre),
        unidadCalculo: concepto.unidadCalculo,
        descripcion: concepto.descripcion,
        activo: true,
      },
      create: {
        ...concepto,
        clienteId: cliente.id,
        nombreNormalizado: normalizarTexto(concepto.nombre),
        activo: true,
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
