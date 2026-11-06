import { prisma } from '../prisma';
import { importarEmpresasConBloqueo } from '../services/erp/ejecutarSincronizacionErp';

function obtenerClienteIdDesdeArgs() {
  const argumento = process.argv.find((arg) => arg.startsWith('--clienteId='));

  if (argumento) {
    return argumento.split('=')[1] || undefined;
  }

  return process.env.CLIENTE_ID || undefined;
}

async function main() {
  const clienteId = obtenerClienteIdDesdeArgs();
  if (!clienteId) throw new Error('Indica --clienteId=... o CLIENTE_ID para importar con bloqueo e historial.');
  const resultado = await importarEmpresasConBloqueo(clienteId);

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
