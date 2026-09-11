DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'DestinoApp'
      AND column_name = 'empresaErpId'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "DestinoApp" ALTER COLUMN "empresaErpId" DROP NOT NULL;
  END IF;
END $$;
