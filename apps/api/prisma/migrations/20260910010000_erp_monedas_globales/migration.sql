CREATE TABLE IF NOT EXISTS "ErpMoneda" (
  "id" TEXT NOT NULL,
  "empresaErpId" TEXT NOT NULL,
  "erpId" TEXT NOT NULL,
  "idMoneda" INTEGER NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "simbolo" TEXT,
  "activo" BOOLEAN NOT NULL,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpMoneda_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ErpMoneda_erpId_key" ON "ErpMoneda"("erpId");
CREATE INDEX IF NOT EXISTS "ErpMoneda_empresaErpId_idx" ON "ErpMoneda"("empresaErpId");
CREATE INDEX IF NOT EXISTS "ErpMoneda_idMoneda_idx" ON "ErpMoneda"("idMoneda");
CREATE INDEX IF NOT EXISTS "ErpMoneda_codigo_idx" ON "ErpMoneda"("codigo");
CREATE INDEX IF NOT EXISTS "ErpMoneda_nombre_idx" ON "ErpMoneda"("nombre");
CREATE INDEX IF NOT EXISTS "ErpMoneda_activo_idx" ON "ErpMoneda"("activo");

UPDATE "ErpCampania"
SET "empresaErpId" = 'global'
WHERE "empresaErpId" <> 'global';
