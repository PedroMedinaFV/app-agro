import { prisma } from '../prisma';
import { listarEmpresasErpImportadas } from '../services/erp/sincronizarErp';

async function main() {
  const limiteArg = process.argv.find((arg) => arg.startsWith('--limite='));
  const limite = Number(limiteArg?.split('=')[1] || 10);
  const empresasImportadas = await listarEmpresasErpImportadas();
  const empresas = empresasImportadas.slice(0, Number.isFinite(limite) ? limite : 10);
  const total = await prisma.erpEmpresa.count();

  console.log(JSON.stringify({
    total,
    empresas,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('No se pudieron listar las empresas importadas.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
