import { prisma } from '../prisma';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Este comando no puede ejecutarse con NODE_ENV=production.');
  }

  console.log('[dev-clean] Limpiando datos operativos y cache ERP de desarrollo.');
  console.log('[dev-clean] Se preservan Cliente, Usuario, IntegracionErp, ErpEmpresa y ClienteEmpresaErp.');

  await prisma.$transaction([
    prisma.notificacionUsuario.deleteMany(),
    prisma.vinculacionErpSugerida.deleteMany(),
    prisma.auditoriaEvento.deleteMany(),

    prisma.planificacionAgricolaLinea.deleteMany(),
    prisma.planificacionAgricola.deleteMany(),

    prisma.protocoloInsumo.deleteMany(),
    prisma.protocoloLabor.deleteMany(),
    prisma.protocoloEtapa.deleteMany(),
    prisma.protocoloProductivo.deleteMany(),

    prisma.gastosComercialesReferencia.deleteMany(),
    prisma.precioReferencia.deleteMany(),
    prisma.destinoVentaReferencia.deleteMany(),
    prisma.conceptoGastoComercial.deleteMany(),

    prisma.laborReferencia.deleteMany(),
    prisma.insumoPlanificacion.deleteMany(),
    prisma.actividadPlanificacion.deleteMany(),
    prisma.especiePlanificacion.deleteMany(),
    prisma.lotePlanificacion.deleteMany(),
    prisma.campoPlanificacion.deleteMany(),
    prisma.zonaPlanificacion.deleteMany(),
    prisma.usuarioCampoErp.deleteMany(),

    prisma.erpCultivo.deleteMany(),
    prisma.erpLote.deleteMany(),
    prisma.erpCampo.deleteMany(),
    prisma.erpZona.deleteMany(),
    prisma.erpActividad.deleteMany(),
    prisma.erpEspecie.deleteMany(),
    prisma.erpCampania.deleteMany(),
    prisma.erpInsumo.deleteMany(),
    prisma.erpServicio.deleteMany(),
    prisma.erpUnidadMedida.deleteMany(),

    prisma.monitoreo.deleteMany(),
    prisma.avanceCosecha.deleteMany(),
    prisma.avanceSiembra.deleteMany(),
    prisma.analisisSuelo.deleteMany(),
    prisma.labor.deleteMany(),
    prisma.lote.deleteMany(),
    prisma.campo.deleteMany(),
    prisma.cultivo.deleteMany(),
  ]);

  console.log('[dev-clean] Limpieza finalizada.');
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
