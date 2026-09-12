import { prisma } from '../prisma';

type UsoTipo = {
  id: number;
  cantidad: number;
};

function contarUsos(valores: Array<number | null>): UsoTipo[] {
  const contador = new Map<number, number>();

  for (const valor of valores) {
    if (typeof valor !== 'number') {
      continue;
    }

    contador.set(valor, (contador.get(valor) || 0) + 1);
  }

  return [...contador.entries()]
    .map(([id, cantidad]) => ({ id, cantidad }))
    .sort((a, b) => a.id - b.id);
}

async function main() {
  const [tiposInsumo, tiposServicio, insumos, servicios] = await Promise.all([
    prisma.erpTipoInsumo.findMany({ select: { idTipoInsumo: true, codigo: true, descripcion: true } }),
    prisma.erpTipoServicio.findMany({ select: { idTipoServicio: true, codigo: true, descripcion: true } }),
    prisma.erpInsumo.findMany({ where: { empresaErpId: 'global' }, select: { idTipoInsumo: true } }),
    prisma.erpServicio.findMany({ where: { empresaErpId: 'global' }, select: { idTipoServicio: true } }),
  ]);

  const tiposInsumoPorId = new Map(tiposInsumo.map((tipo) => [tipo.idTipoInsumo, tipo]));
  const tiposServicioPorId = new Map(tiposServicio.map((tipo) => [tipo.idTipoServicio, tipo]));
  const usosInsumo = contarUsos(insumos.map((insumo) => insumo.idTipoInsumo));
  const usosServicio = contarUsos(servicios.map((servicio) => servicio.idTipoServicio));

  console.log(JSON.stringify({
    tiposInsumoImportados: tiposInsumo.length,
    tiposServicioImportados: tiposServicio.length,
    tiposInsumoUsados: usosInsumo.length,
    tiposServicioUsados: usosServicio.length,
    tiposInsumoFaltantes: usosInsumo.filter((uso) => !tiposInsumoPorId.has(uso.id)),
    tiposServicioFaltantes: usosServicio.filter((uso) => !tiposServicioPorId.has(uso.id)),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('No se pudo verificar la integridad de tipos de padrones.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
