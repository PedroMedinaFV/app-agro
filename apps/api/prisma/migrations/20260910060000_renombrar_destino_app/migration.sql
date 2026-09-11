ALTER TABLE IF EXISTS "DestinoVentaReferencia" RENAME TO "DestinoApp";

ALTER INDEX IF EXISTS "DestinoVentaReferencia_clienteId_idx" RENAME TO "DestinoApp_clienteId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_empresaErpId_idx" RENAME TO "DestinoApp_empresaErpId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_campoPlanificacionId_idx" RENAME TO "DestinoApp_campoAppId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_campoAppId_idx" RENAME TO "DestinoApp_campoAppId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_actividadPlanificacionId_idx" RENAME TO "DestinoApp_actividadAppId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_actividadAppId_idx" RENAME TO "DestinoApp_actividadAppId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_actividadErpId_idx" RENAME TO "DestinoApp_actividadErpId_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_activo_idx" RENAME TO "DestinoApp_activo_idx";
ALTER INDEX IF EXISTS "DestinoVentaReferencia_clienteId_destinoVentaNormalizado_key" RENAME TO "DestinoApp_clienteId_destinoVentaNormalizado_key";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DestinoVentaReferencia_pkey') THEN
    ALTER TABLE "DestinoApp" RENAME CONSTRAINT "DestinoVentaReferencia_pkey" TO "DestinoApp_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DestinoVentaReferencia_clienteId_fkey') THEN
    ALTER TABLE "DestinoApp" RENAME CONSTRAINT "DestinoVentaReferencia_clienteId_fkey" TO "DestinoApp_clienteId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DestinoVentaReferencia_actividadPlanificacionId_fkey') THEN
    ALTER TABLE "DestinoApp" RENAME CONSTRAINT "DestinoVentaReferencia_actividadPlanificacionId_fkey" TO "DestinoApp_actividadAppId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DestinoVentaReferencia_actividadAppId_fkey') THEN
    ALTER TABLE "DestinoApp" RENAME CONSTRAINT "DestinoVentaReferencia_actividadAppId_fkey" TO "DestinoApp_actividadAppId_fkey";
  END IF;
END $$;
