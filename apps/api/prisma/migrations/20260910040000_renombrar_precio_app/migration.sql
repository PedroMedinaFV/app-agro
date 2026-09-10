DO $$
BEGIN
  IF to_regclass('"PrecioReferencia"') IS NOT NULL AND to_regclass('"PrecioApp"') IS NULL THEN
    ALTER TABLE "PrecioReferencia" RENAME TO "PrecioApp";
  END IF;
END $$;

DO $$
DECLARE
  item text[];
BEGIN
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['PrecioReferencia_pkey', 'PrecioApp_pkey'],
    ARRAY['PrecioReferencia_clienteId_fkey', 'PrecioApp_clienteId_fkey'],
    ARRAY['PrecioReferencia_actividadAppId_fkey', 'PrecioApp_actividadAppId_fkey'],
    ARRAY['PrecioReferencia_actividadPlanificacionId_fkey', 'PrecioApp_actividadAppId_fkey'],
    ARRAY['PrecioReferencia_especieAppId_fkey', 'PrecioApp_especieAppId_fkey'],
    ARRAY['PrecioReferencia_especiePlanificacionId_fkey', 'PrecioApp_especieAppId_fkey']
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = item[1]
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = item[2]
    ) THEN
      EXECUTE format('ALTER TABLE "PrecioApp" RENAME CONSTRAINT %I TO %I', item[1], item[2]);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  item text[];
BEGIN
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['PrecioReferencia_clienteId_idx', 'PrecioApp_clienteId_idx'],
    ARRAY['PrecioReferencia_actividadAppId_idx', 'PrecioApp_actividadAppId_idx'],
    ARRAY['PrecioReferencia_actividadPlanificacionId_idx', 'PrecioApp_actividadAppId_idx'],
    ARRAY['PrecioReferencia_actividadErpId_idx', 'PrecioApp_actividadErpId_idx'],
    ARRAY['PrecioReferencia_destinoVenta_idx', 'PrecioApp_destinoVenta_idx'],
    ARRAY['PrecioReferencia_activo_idx', 'PrecioApp_activo_idx']
  ]
  LOOP
    IF to_regclass(item[1]) IS NOT NULL AND to_regclass(item[2]) IS NULL THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', item[1], item[2]);
    END IF;
  END LOOP;
END $$;
