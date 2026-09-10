CREATE TABLE IF NOT EXISTS "ObservacionCampo" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "usuarioId" TEXT,
  "campoAppId" TEXT NOT NULL,
  "campoErpId" TEXT,
  "loteAppId" TEXT,
  "loteErpId" TEXT,
  "registroMovilId" TEXT,
  "titulo" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "severidad" TEXT NOT NULL DEFAULT 'media',
  "latitud" DOUBLE PRECISION,
  "longitud" DOUBLE PRECISION,
  "fechaEvento" TIMESTAMP(3) NOT NULL,
  "origen" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ObservacionCampo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ObservacionCampo_clienteId_idx" ON "ObservacionCampo"("clienteId");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_usuarioId_idx" ON "ObservacionCampo"("usuarioId");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_campoAppId_idx" ON "ObservacionCampo"("campoAppId");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_loteAppId_idx" ON "ObservacionCampo"("loteAppId");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_registroMovilId_idx" ON "ObservacionCampo"("registroMovilId");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_severidad_idx" ON "ObservacionCampo"("severidad");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_fechaEvento_idx" ON "ObservacionCampo"("fechaEvento");
CREATE INDEX IF NOT EXISTS "ObservacionCampo_origen_idx" ON "ObservacionCampo"("origen");
CREATE UNIQUE INDEX IF NOT EXISTS "ObservacionCampo_clienteId_registroMovilId_key" ON "ObservacionCampo"("clienteId", "registroMovilId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObservacionCampo_clienteId_fkey'
  ) THEN
    ALTER TABLE "ObservacionCampo"
    ADD CONSTRAINT "ObservacionCampo_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObservacionCampo_usuarioId_fkey'
  ) THEN
    ALTER TABLE "ObservacionCampo"
    ADD CONSTRAINT "ObservacionCampo_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObservacionCampo_campoAppId_fkey'
  ) THEN
    ALTER TABLE "ObservacionCampo"
    ADD CONSTRAINT "ObservacionCampo_campoAppId_fkey"
    FOREIGN KEY ("campoAppId") REFERENCES "CampoApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ObservacionCampo_loteAppId_fkey'
  ) THEN
    ALTER TABLE "ObservacionCampo"
    ADD CONSTRAINT "ObservacionCampo_loteAppId_fkey"
    FOREIGN KEY ("loteAppId") REFERENCES "LoteApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
