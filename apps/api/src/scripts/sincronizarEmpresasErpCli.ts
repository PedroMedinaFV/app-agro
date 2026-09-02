import { prisma } from '../prisma';
import { sincronizarEmpresasErp } from '../services/erp/sincronizarErp';

function obtenerClienteIdDesdeArgs() {
  const argumento = process.argv.find((arg) => arg.startsWith('--clienteId='));

  if (argumento) {
    return argumento.split('=')[1] || undefined;
  }

  return process.env.CLIENTE_ID || undefined;
}

async function main() {
  const resultado = await sincronizarEmpresasErp(obtenerClienteIdDesdeArgs());

  console.log(JSON.stringify(resultado, null, 2));
}

main()
  .catch((error) => {
    console.error('No se pudieron sincronizar las empresas del ERP.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
