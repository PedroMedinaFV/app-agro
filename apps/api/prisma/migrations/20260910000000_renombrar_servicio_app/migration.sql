DO $$
BEGIN
  IF to_regclass('"LaborReferencia"') IS NOT NULL AND to_regclass('"ServicioApp"') IS NULL THEN
    ALTER TABLE "LaborReferencia" RENAME TO "ServicioApp";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ProtocoloLabor'
      AND column_name = 'laborReferenciaId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'ProtocoloLabor'
      AND column_name = 'servicioAppId'
  ) THEN
    ALTER TABLE "ProtocoloLabor" RENAME COLUMN "laborReferenciaId" TO "servicioAppId";
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = '"ProtocoloLabor"'::regclass
    AND conname LIKE '%laborReferenciaId%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "ProtocoloLabor" RENAME CONSTRAINT %I TO %I', constraint_name, 'ProtocoloLabor_servicioAppId_fkey');
  END IF;
END $$;

DO $$
DECLARE
  index_name text;
BEGIN
  SELECT indexname INTO index_name
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND tablename = 'ProtocoloLabor'
    AND indexname LIKE '%laborReferenciaId%';

  IF index_name IS NOT NULL THEN
    EXECUTE format('ALTER INDEX %I RENAME TO %I', index_name, 'ProtocoloLabor_servicioAppId_idx');
  END IF;
END $$;
