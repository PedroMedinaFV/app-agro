DO $$
BEGIN
  IF to_regclass('"ZonaPlanificacion"') IS NOT NULL AND to_regclass('"ZonaApp"') IS NULL THEN
    ALTER TABLE "ZonaPlanificacion" RENAME TO "ZonaApp";
  END IF;

  IF to_regclass('"CampoPlanificacion"') IS NOT NULL AND to_regclass('"CampoApp"') IS NULL THEN
    ALTER TABLE "CampoPlanificacion" RENAME TO "CampoApp";
  END IF;

  IF to_regclass('"LotePlanificacion"') IS NOT NULL AND to_regclass('"LoteApp"') IS NULL THEN
    ALTER TABLE "LotePlanificacion" RENAME TO "LoteApp";
  END IF;

  IF to_regclass('"EspeciePlanificacion"') IS NOT NULL AND to_regclass('"EspecieApp"') IS NULL THEN
    ALTER TABLE "EspeciePlanificacion" RENAME TO "EspecieApp";
  END IF;

  IF to_regclass('"ActividadPlanificacion"') IS NOT NULL AND to_regclass('"ActividadApp"') IS NULL THEN
    ALTER TABLE "ActividadPlanificacion" RENAME TO "ActividadApp";
  END IF;

  IF to_regclass('"InsumoPlanificacion"') IS NOT NULL AND to_regclass('"InsumoApp"') IS NULL THEN
    ALTER TABLE "InsumoPlanificacion" RENAME TO "InsumoApp";
  END IF;
END $$;

DO $$
DECLARE
  item text[];
BEGIN
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['CampoApp', 'zonaPlanificacionId', 'zonaAppId'],
    ARRAY['LoteApp', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['ActividadApp', 'especiePlanificacionId', 'especieAppId'],
    ARRAY['ProtocoloProductivo', 'actividadPlanificacionId', 'actividadAppId'],
    ARRAY['ProtocoloProductivo', 'zonaPlanificacionId', 'zonaAppId'],
    ARRAY['ProtocoloProductivo', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['ProtocoloInsumo', 'insumoPlanificacionId', 'insumoAppId'],
    ARRAY['PlanificacionAgricolaLinea', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['PlanificacionAgricolaLinea', 'lotePlanificacionId', 'loteAppId'],
    ARRAY['PlanificacionAgricolaLinea', 'actividadPlanificacionId', 'actividadAppId'],
    ARRAY['DestinoVentaReferencia', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['DestinoVentaReferencia', 'actividadPlanificacionId', 'actividadAppId'],
    ARRAY['PrecioReferencia', 'actividadPlanificacionId', 'actividadAppId'],
    ARRAY['PrecioReferencia', 'especiePlanificacionId', 'especieAppId'],
    ARRAY['GastosComercialesReferencia', 'zonaPlanificacionId', 'zonaAppId'],
    ARRAY['GastosComercialesReferencia', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['GastosComercialesReferencia', 'actividadPlanificacionId', 'actividadAppId'],
    ARRAY['PrecipitacionCampo', 'campoPlanificacionId', 'campoAppId'],
    ARRAY['PrecipitacionCampo', 'lotePlanificacionId', 'loteAppId']
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = item[1]
        AND column_name = item[2]
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = item[1]
        AND column_name = item[3]
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', item[1], item[2], item[3]);
    END IF;
  END LOOP;
END $$;

ALTER TABLE "ActividadApp"
  ADD COLUMN IF NOT EXISTS "tipoGrano" TEXT,
  ADD COLUMN IF NOT EXISTS "tipoCultivo" TEXT,
  ADD COLUMN IF NOT EXISTS "epocaSiembra" TEXT;
