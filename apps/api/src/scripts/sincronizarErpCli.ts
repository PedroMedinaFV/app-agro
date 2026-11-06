import { cargarEnvRaiz } from '../config/cargarEnvRaiz';
import { prisma } from '../prisma';
import { ejecutarSincronizacionErp } from '../services/erp/ejecutarSincronizacionErp';
import { PadronErpSincronizable, padronesErpSincronizables } from '@agro/tipos';

cargarEnvRaiz();

function obtenerClienteIdDesdeArgs() {
  const argumento = process.argv.find((arg) => arg.startsWith('--clienteId='));

  if (argumento) {
    return argumento.split('=')[1] || undefined;
  }

  return process.env.CLIENTE_ID || undefined;
}

function obtenerItemsDesdeArgs(): PadronErpSincronizable[] | undefined {
  const argumento = process.argv.find((arg) => arg.startsWith('--items='));

  if (!argumento) {
    return undefined;
  }

  const items = argumento
    .split('=')[1]
    ?.split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean) || [];

  for (const item of items) {
    if (!padronesErpSincronizables.includes(item as PadronErpSincronizable)) {
      throw new Error(`Padron no soportado: ${item}`);
    }
  }

  return items as PadronErpSincronizable[];
}

async function main() {
  const clienteId = obtenerClienteIdDesdeArgs();
  const items = obtenerItemsDesdeArgs();
  if (!clienteId) throw new Error('Indica --clienteId=... o CLIENTE_ID para sincronizar con bloqueo e historial.');
  const resultado = await ejecutarSincronizacionErp(clienteId, undefined, items);

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
