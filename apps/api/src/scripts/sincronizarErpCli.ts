import { cargarEnvRaiz } from '../config/cargarEnvRaiz';
import { prisma } from '../prisma';
import { sincronizarSnapshotErp } from '../services/erp/sincronizarErp';

cargarEnvRaiz();

function obtenerClienteIdDesdeArgs() {
  const argumento = process.argv.find((arg) => arg.startsWith('--clienteId='));

  if (argumento) {
    return argumento.split('=')[1] || undefined;
  }

  return process.env.CLIENTE_ID || undefined;
}

async function main() {
  const clienteId = obtenerClienteIdDesdeArgs();
  const resultado = await sincronizarSnapshotErp(clienteId);

  console.log(JSON.stringify(resultado, null, 2));
}

main()
  .catch((error) => {
    console.error('No se pudo sincronizar el ERP.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
