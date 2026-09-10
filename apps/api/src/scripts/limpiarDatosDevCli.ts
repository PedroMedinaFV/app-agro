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

    prisma.servicioApp.deleteMany(),
    prisma.insumoApp.deleteMany(),
    prisma.actividadApp.deleteMany(),
    prisma.especieApp.deleteMany(),
    prisma.loteApp.deleteMany(),
    prisma.campoApp.deleteMany(),
    prisma.zonaApp.deleteMany(),
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
    prisma.erpMoneda.deleteMany(),
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
