import { prisma } from '../prisma';

async function main() {
  const empresasAgroSeleccionadas = await prisma.clienteEmpresaErp.findMany({
    where: { clienteId: 'cliente-demo' },
    select: { empresaErpId: true },
    orderBy: { empresaErpId: 'asc' },
  });
  const empresaErpIds = empresasAgroSeleccionadas.map((empresa) => empresa.empresaErpId);
  // Se consulta secuencialmente para no saturar el pooler de Supabase durante verificaciones locales.
  const empresas = await prisma.erpEmpresa.count();
  const empresasAgro = await prisma.clienteEmpresaErp.count({ where: { clienteId: 'cliente-demo' } });
  const zonas = await prisma.erpZona.count();
  const campos = await prisma.erpCampo.count();
  const lotes = await prisma.erpLote.count();
  const actividades = await prisma.erpActividad.count();
  const especies = await prisma.erpEspecie.count();
  const campanias = await prisma.erpCampania.count();
  const cultivos = await prisma.erpCultivo.count();
  const insumos = await prisma.erpInsumo.count();
  const servicios = await prisma.erpServicio.count();
  const unidadesMedida = await prisma.erpUnidadMedida.count();
  const integracion = await prisma.integracionErp.findUnique({
    where: { clienteId: 'cliente-demo' },
    select: { ultimoSyncEn: true, ultimoTestOk: true, ultimoTestEn: true },
  });
  const zonasAgro = await prisma.erpZona.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const camposAgro = await prisma.erpCampo.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const lotesAgro = await prisma.erpLote.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const actividadesAgro = await prisma.erpActividad.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const especiesAgro = await prisma.erpEspecie.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const campaniasAgro = await prisma.erpCampania.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const cultivosAgro = await prisma.erpCultivo.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const insumosAgro = await prisma.erpInsumo.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const serviciosAgro = await prisma.erpServicio.count({ where: { empresaErpId: { in: empresaErpIds } } });
  const unidadesMedidaAgro = await prisma.erpUnidadMedida.count({ where: { empresaErpId: { in: empresaErpIds } } });

  console.log(
    JSON.stringify(
      {
        empresas,
        empresasAgro,
        empresaErpIds,
        zonas,
        campos,
        lotes,
        actividades,
        especies,
        campanias,
        cultivos,
        insumos,
        servicios,
        unidadesMedida,
        soloEmpresasAgro: {
          zonas: zonasAgro,
          campos: camposAgro,
          lotes: lotesAgro,
          actividades: actividadesAgro,
          especies: especiesAgro,
          campanias: campaniasAgro,
          cultivos: cultivosAgro,
          insumos: insumosAgro,
          servicios: serviciosAgro,
          unidadesMedida: unidadesMedidaAgro,
        },
        integracion,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('No se pudo verificar la sincronizacion ERP.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
