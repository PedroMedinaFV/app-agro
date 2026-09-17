ALTER TABLE "PrecioApp"
  ALTER COLUMN "actividadAppId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "PrecioApp_especieAppId_idx" ON "PrecioApp"("especieAppId");
CREATE INDEX IF NOT EXISTS "PrecioApp_especieErpId_idx" ON "PrecioApp"("especieErpId");
