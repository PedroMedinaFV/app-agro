/*
  Warnings:

  - Made the column `actividadAppId` on table `ProtocoloProductivo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `empresaErpId` on table `ZonaApp` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PrecioApp" DROP CONSTRAINT "PrecioApp_actividadAppId_fkey";

-- AlterTable
ALTER TABLE "ActividadApp" RENAME CONSTRAINT "ActividadPlanificacion_pkey" TO "ActividadApp_pkey";

-- AlterTable
ALTER TABLE "CampoApp" RENAME CONSTRAINT "CampoPlanificacion_pkey" TO "CampoApp_pkey";

-- AlterTable
ALTER TABLE "ConceptoGastoComercialApp" RENAME CONSTRAINT "ConceptoGastoComercial_pkey" TO "ConceptoGastoComercialApp_pkey";

-- AlterTable
ALTER TABLE "EspecieApp" RENAME CONSTRAINT "EspeciePlanificacion_pkey" TO "EspecieApp_pkey";

-- AlterTable
ALTER TABLE "GastoComercialApp" RENAME CONSTRAINT "GastosComercialesReferencia_pkey" TO "GastoComercialApp_pkey";

-- AlterTable
ALTER TABLE "InsumoApp" RENAME CONSTRAINT "InsumoPlanificacion_pkey" TO "InsumoApp_pkey";

-- AlterTable
ALTER TABLE "LoteApp" RENAME CONSTRAINT "LotePlanificacion_pkey" TO "LoteApp_pkey";

-- AlterTable
ALTER TABLE "LoteMapaNdvi" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProtocoloProductivo" ALTER COLUMN "actividadAppId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecorridaCampo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServicioApp" RENAME CONSTRAINT "LaborReferencia_pkey" TO "ServicioApp_pkey";

-- AlterTable
ALTER TABLE "ZonaApp" RENAME CONSTRAINT "ZonaPlanificacion_pkey" TO "ZonaApp_pkey";

-- AlterTable
ALTER TABLE "ZonaApp" ALTER COLUMN "empresaErpId" SET NOT NULL;

-- RenameForeignKey
ALTER TABLE "ActividadApp" RENAME CONSTRAINT "ActividadPlanificacion_clienteId_fkey" TO "ActividadApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "ActividadApp" RENAME CONSTRAINT "ActividadPlanificacion_especiePlanificacionId_fkey" TO "ActividadApp_especieAppId_fkey";

-- RenameForeignKey
ALTER TABLE "CampoApp" RENAME CONSTRAINT "CampoPlanificacion_clienteId_fkey" TO "CampoApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "CampoApp" RENAME CONSTRAINT "CampoPlanificacion_zonaPlanificacionId_fkey" TO "CampoApp_zonaAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ConceptoGastoComercialApp" RENAME CONSTRAINT "ConceptoGastoComercial_clienteId_fkey" TO "ConceptoGastoComercialApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "EspecieApp" RENAME CONSTRAINT "EspeciePlanificacion_clienteId_fkey" TO "EspecieApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "GastoComercialApp" RENAME CONSTRAINT "GastosComercialesReferencia_actividadPlanificacionId_fkey" TO "GastoComercialApp_actividadAppId_fkey";

-- RenameForeignKey
ALTER TABLE "GastoComercialApp" RENAME CONSTRAINT "GastosComercialesReferencia_clienteId_fkey" TO "GastoComercialApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "InsumoApp" RENAME CONSTRAINT "InsumoPlanificacion_clienteId_fkey" TO "InsumoApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "LoteApp" RENAME CONSTRAINT "LotePlanificacion_campoPlanificacionId_fkey" TO "LoteApp_campoAppId_fkey";

-- RenameForeignKey
ALTER TABLE "LoteApp" RENAME CONSTRAINT "LotePlanificacion_clienteId_fkey" TO "LoteApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "PlanificacionAgricolaLinea" RENAME CONSTRAINT "PlanificacionAgricolaLinea_actividadPlanificacionId_fkey" TO "PlanificacionAgricolaLinea_actividadAppId_fkey";

-- RenameForeignKey
ALTER TABLE "PlanificacionAgricolaLinea" RENAME CONSTRAINT "PlanificacionAgricolaLinea_campoPlanificacionId_fkey" TO "PlanificacionAgricolaLinea_campoAppId_fkey";

-- RenameForeignKey
ALTER TABLE "PlanificacionAgricolaLinea" RENAME CONSTRAINT "PlanificacionAgricolaLinea_lotePlanificacionId_fkey" TO "PlanificacionAgricolaLinea_loteAppId_fkey";

-- RenameForeignKey
ALTER TABLE "PrecipitacionCampo" RENAME CONSTRAINT "PrecipitacionCampo_campoPlanificacionId_fkey" TO "PrecipitacionCampo_campoAppId_fkey";

-- RenameForeignKey
ALTER TABLE "PrecipitacionCampo" RENAME CONSTRAINT "PrecipitacionCampo_lotePlanificacionId_fkey" TO "PrecipitacionCampo_loteAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ProtocoloInsumo" RENAME CONSTRAINT "ProtocoloInsumo_insumoPlanificacionId_fkey" TO "ProtocoloInsumo_insumoAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ProtocoloProductivo" RENAME CONSTRAINT "ProtocoloProductivo_actividadPlanificacionId_fkey" TO "ProtocoloProductivo_actividadAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ProtocoloProductivo" RENAME CONSTRAINT "ProtocoloProductivo_campoPlanificacionId_fkey" TO "ProtocoloProductivo_campoAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ProtocoloProductivo" RENAME CONSTRAINT "ProtocoloProductivo_zonaPlanificacionId_fkey" TO "ProtocoloProductivo_zonaAppId_fkey";

-- RenameForeignKey
ALTER TABLE "ServicioApp" RENAME CONSTRAINT "LaborReferencia_clienteId_fkey" TO "ServicioApp_clienteId_fkey";

-- RenameForeignKey
ALTER TABLE "ZonaApp" RENAME CONSTRAINT "ZonaPlanificacion_clienteId_fkey" TO "ZonaApp_clienteId_fkey";

-- AddForeignKey
ALTER TABLE "PrecioApp" ADD CONSTRAINT "PrecioApp_actividadAppId_fkey" FOREIGN KEY ("actividadAppId") REFERENCES "ActividadApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ActividadPlanificacion_actividadErpId_idx" RENAME TO "ActividadApp_actividadErpId_idx";

-- RenameIndex
ALTER INDEX "ActividadPlanificacion_clienteId_idx" RENAME TO "ActividadApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "ActividadPlanificacion_empresaErpId_idx" RENAME TO "ActividadApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "ActividadPlanificacion_especiePlanificacionId_idx" RENAME TO "ActividadApp_especieAppId_idx";

-- RenameIndex
ALTER INDEX "ActividadPlanificacion_estadoVinculacion_idx" RENAME TO "ActividadApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "CampoPlanificacion_campoErpId_idx" RENAME TO "CampoApp_campoErpId_idx";

-- RenameIndex
ALTER INDEX "CampoPlanificacion_clienteId_idx" RENAME TO "CampoApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "CampoPlanificacion_empresaErpId_idx" RENAME TO "CampoApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "CampoPlanificacion_estadoVinculacion_idx" RENAME TO "CampoApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "CampoPlanificacion_zonaPlanificacionId_idx" RENAME TO "CampoApp_zonaAppId_idx";

-- RenameIndex
ALTER INDEX "ConceptoGastoComercial_activo_idx" RENAME TO "ConceptoGastoComercialApp_activo_idx";

-- RenameIndex
ALTER INDEX "ConceptoGastoComercial_clienteId_idx" RENAME TO "ConceptoGastoComercialApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "ConceptoGastoComercial_clienteId_nombreNormalizado_key" RENAME TO "ConceptoGastoComercialApp_clienteId_nombreNormalizado_key";

-- RenameIndex
ALTER INDEX "ConceptoGastoComercial_codigo_idx" RENAME TO "ConceptoGastoComercialApp_codigo_idx";

-- RenameIndex
ALTER INDEX "EspeciePlanificacion_clienteId_idx" RENAME TO "EspecieApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "EspeciePlanificacion_empresaErpId_idx" RENAME TO "EspecieApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "EspeciePlanificacion_especieErpId_idx" RENAME TO "EspecieApp_especieErpId_idx";

-- RenameIndex
ALTER INDEX "EspeciePlanificacion_estadoVinculacion_idx" RENAME TO "EspecieApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_actividadErpId_idx" RENAME TO "GastoComercialApp_actividadErpId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_actividadPlanificacionId_idx" RENAME TO "GastoComercialApp_actividadAppId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_activo_idx" RENAME TO "GastoComercialApp_activo_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_campaniaErpId_idx" RENAME TO "GastoComercialApp_campaniaErpId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_campoPlanificacionId_idx" RENAME TO "GastoComercialApp_campoAppId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_clienteId_idx" RENAME TO "GastoComercialApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_empresaErpId_idx" RENAME TO "GastoComercialApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "GastosComercialesReferencia_zonaPlanificacionId_idx" RENAME TO "GastoComercialApp_zonaAppId_idx";

-- RenameIndex
ALTER INDEX "InsumoPlanificacion_clienteId_idx" RENAME TO "InsumoApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "InsumoPlanificacion_empresaErpId_idx" RENAME TO "InsumoApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "InsumoPlanificacion_estadoVinculacion_idx" RENAME TO "InsumoApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "InsumoPlanificacion_insumoErpId_idx" RENAME TO "InsumoApp_insumoErpId_idx";

-- RenameIndex
ALTER INDEX "LotePlanificacion_campoPlanificacionId_idx" RENAME TO "LoteApp_campoAppId_idx";

-- RenameIndex
ALTER INDEX "LotePlanificacion_clienteId_idx" RENAME TO "LoteApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "LotePlanificacion_estadoVinculacion_idx" RENAME TO "LoteApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "LotePlanificacion_loteErpId_idx" RENAME TO "LoteApp_loteErpId_idx";

-- RenameIndex
ALTER INDEX "PlanificacionAgricolaLinea_actividadPlanificacionId_idx" RENAME TO "PlanificacionAgricolaLinea_actividadAppId_idx";

-- RenameIndex
ALTER INDEX "PlanificacionAgricolaLinea_campoPlanificacionId_idx" RENAME TO "PlanificacionAgricolaLinea_campoAppId_idx";

-- RenameIndex
ALTER INDEX "PlanificacionAgricolaLinea_lotePlanificacionId_idx" RENAME TO "PlanificacionAgricolaLinea_loteAppId_idx";

-- RenameIndex
ALTER INDEX "PlanificacionAgricolaLinea_planificacionId_campoPlanificacionId" RENAME TO "PlanificacionAgricolaLinea_planificacionId_campoAppId_loteA_key";

-- RenameIndex
ALTER INDEX "PrecioReferencia_actividadErpId_idx" RENAME TO "PrecioApp_actividadErpId_idx";

-- RenameIndex
ALTER INDEX "PrecioReferencia_actividadPlanificacionId_idx" RENAME TO "PrecioApp_actividadAppId_idx";

-- RenameIndex
ALTER INDEX "PrecioReferencia_activo_idx" RENAME TO "PrecioApp_activo_idx";

-- RenameIndex
ALTER INDEX "PrecioReferencia_clienteId_idx" RENAME TO "PrecioApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "PrecioReferencia_destinoVenta_idx" RENAME TO "PrecioApp_destinoVenta_idx";

-- RenameIndex
ALTER INDEX "PrecipitacionCampo_campoPlanificacionId_idx" RENAME TO "PrecipitacionCampo_campoAppId_idx";

-- RenameIndex
ALTER INDEX "PrecipitacionCampo_lotePlanificacionId_idx" RENAME TO "PrecipitacionCampo_loteAppId_idx";

-- RenameIndex
ALTER INDEX "ProtocoloInsumo_insumoPlanificacionId_idx" RENAME TO "ProtocoloInsumo_insumoAppId_idx";

-- RenameIndex
ALTER INDEX "ProtocoloProductivo_actividadPlanificacionId_idx" RENAME TO "ProtocoloProductivo_actividadAppId_idx";

-- RenameIndex
ALTER INDEX "ProtocoloProductivo_campoPlanificacionId_idx" RENAME TO "ProtocoloProductivo_campoAppId_idx";

-- RenameIndex
ALTER INDEX "ProtocoloProductivo_zonaPlanificacionId_idx" RENAME TO "ProtocoloProductivo_zonaAppId_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_activo_idx" RENAME TO "ServicioApp_activo_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_clienteId_codigo_key" RENAME TO "ServicioApp_clienteId_codigo_key";

-- RenameIndex
ALTER INDEX "LaborReferencia_clienteId_idx" RENAME TO "ServicioApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_clienteId_servicioErpId_key" RENAME TO "ServicioApp_clienteId_servicioErpId_key";

-- RenameIndex
ALTER INDEX "LaborReferencia_empresaErpId_idx" RENAME TO "ServicioApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_estadoVinculacion_idx" RENAME TO "ServicioApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_nombre_idx" RENAME TO "ServicioApp_nombre_idx";

-- RenameIndex
ALTER INDEX "LaborReferencia_servicioErpId_idx" RENAME TO "ServicioApp_servicioErpId_idx";

-- RenameIndex
ALTER INDEX "VinculacionErpSugerida_clienteId_entidadTipo_entidadPlanificaci" RENAME TO "VinculacionErpSugerida_clienteId_entidadTipo_entidadPlanifi_key";

-- RenameIndex
ALTER INDEX "ZonaPlanificacion_clienteId_idx" RENAME TO "ZonaApp_clienteId_idx";

-- RenameIndex
ALTER INDEX "ZonaPlanificacion_empresaErpId_idx" RENAME TO "ZonaApp_empresaErpId_idx";

-- RenameIndex
ALTER INDEX "ZonaPlanificacion_estadoVinculacion_idx" RENAME TO "ZonaApp_estadoVinculacion_idx";

-- RenameIndex
ALTER INDEX "ZonaPlanificacion_zonaErpId_idx" RENAME TO "ZonaApp_zonaErpId_idx";
