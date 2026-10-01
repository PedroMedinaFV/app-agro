CREATE TABLE "RecorridaCampo" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "usuarioId" TEXT,
  "campoAppId" TEXT NOT NULL,
  "campoErpId" TEXT,
  "loteAppId" TEXT,
  "loteErpId" TEXT,
  "campaniaErpId" TEXT,
  "titulo" TEXT NOT NULL,
  "objetivo" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'en_curso',
  "fechaInicio" TIMESTAMP(3) NOT NULL,
  "fechaCierre" TIMESTAMP(3),
  "observaciones" TEXT,
  "origen" TEXT NOT NULL,
  "cantidadObservaciones" INTEGER NOT NULL DEFAULT 0,
  "severidadMaxima" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RecorridaCampo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ObservacionCampo" ADD COLUMN "recorridaId" TEXT;

CREATE INDEX "RecorridaCampo_clienteId_idx" ON "RecorridaCampo"("clienteId");
CREATE INDEX "RecorridaCampo_usuarioId_idx" ON "RecorridaCampo"("usuarioId");
CREATE INDEX "RecorridaCampo_campoAppId_idx" ON "RecorridaCampo"("campoAppId");
CREATE INDEX "RecorridaCampo_loteAppId_idx" ON "RecorridaCampo"("loteAppId");
CREATE INDEX "RecorridaCampo_estado_idx" ON "RecorridaCampo"("estado");
CREATE INDEX "RecorridaCampo_fechaInicio_idx" ON "RecorridaCampo"("fechaInicio");
CREATE INDEX "ObservacionCampo_recorridaId_idx" ON "ObservacionCampo"("recorridaId");

ALTER TABLE "RecorridaCampo"
  ADD CONSTRAINT "RecorridaCampo_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecorridaCampo"
  ADD CONSTRAINT "RecorridaCampo_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecorridaCampo"
  ADD CONSTRAINT "RecorridaCampo_campoAppId_fkey"
  FOREIGN KEY ("campoAppId") REFERENCES "CampoApp"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecorridaCampo"
  ADD CONSTRAINT "RecorridaCampo_loteAppId_fkey"
  FOREIGN KEY ("loteAppId") REFERENCES "LoteApp"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ObservacionCampo"
  ADD CONSTRAINT "ObservacionCampo_recorridaId_fkey"
  FOREIGN KEY ("recorridaId") REFERENCES "RecorridaCampo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
