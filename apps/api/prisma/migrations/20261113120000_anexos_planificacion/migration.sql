BEGIN;
ALTER TABLE "PlanificacionAgricola"
  ADD COLUMN "tipoDocumento" TEXT NOT NULL DEFAULT 'base',
  ADD COLUMN "planificacionOriginalId" TEXT,
  ADD COLUMN "numeroAnexo" INTEGER,
  ADD COLUMN "motivoIncorporacion" TEXT,
  ADD COLUMN "fechaIncorporacion" DATE,
  ADD CONSTRAINT "PlanificacionAgricola_planificacionOriginalId_fkey" FOREIGN KEY ("planificacionOriginalId") REFERENCES "PlanificacionAgricola"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlanificacionAgricola_tipo_check" CHECK (
    ("tipoDocumento" = 'base' AND "planificacionOriginalId" IS NULL AND "numeroAnexo" IS NULL)
    OR ("tipoDocumento" = 'anexo' AND "planificacionOriginalId" IS NOT NULL AND NOT "escenarioOriginal" AND "fechaIncorporacion" IS NOT NULL AND "motivoIncorporacion" IS NOT NULL AND length(trim("motivoIncorporacion")) > 0 AND ("estado" <> 'cerrada' OR ("numeroAnexo" IS NOT NULL AND "numeroAnexo" > 0)))
  );
CREATE UNIQUE INDEX "PlanificacionAgricola_planificacionOriginalId_numeroAnexo_key" ON "PlanificacionAgricola"("planificacionOriginalId", "numeroAnexo");
CREATE UNIQUE INDEX "PlanificacionAgricola_original_cerrada_key" ON "PlanificacionAgricola"("clienteId", "campaniaErpId") WHERE "tipoDocumento" = 'base' AND "estado" = 'cerrada' AND "escenarioOriginal";
ALTER TABLE "PlanificacionAgricolaLinea" ALTER COLUMN "actividadAppId" DROP NOT NULL;
CREATE TABLE "PlanificacionAlcanceLote" (
  "planificacionId" TEXT NOT NULL REFERENCES "PlanificacionAgricola"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "loteAppId" TEXT NOT NULL REFERENCES "LoteApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("planificacionId", "loteAppId")
);
CREATE INDEX "PlanificacionAlcanceLote_loteAppId_idx" ON "PlanificacionAlcanceLote"("loteAppId");
CREATE TABLE "PlanificacionLoteAprobado" (
  "clienteId" TEXT NOT NULL,
  "campaniaErpId" TEXT NOT NULL,
  "loteAppId" TEXT NOT NULL REFERENCES "LoteApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "planificacionId" TEXT NOT NULL REFERENCES "PlanificacionAgricola"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("clienteId", "campaniaErpId", "loteAppId")
);
CREATE INDEX "PlanificacionLoteAprobado_planificacionId_idx" ON "PlanificacionLoteAprobado"("planificacionId");
CREATE INDEX "PlanificacionLoteAprobado_loteAppId_idx" ON "PlanificacionLoteAprobado"("loteAppId");
INSERT INTO "PlanificacionAlcanceLote" SELECT DISTINCT "planificacionId", "loteAppId" FROM "PlanificacionAgricolaLinea";
-- No reescribir historicos. El servicio bloquea anexos si la original requiere revision.
INSERT INTO "PlanificacionLoteAprobado"
SELECT DISTINCT p."clienteId", p."campaniaErpId", l."loteAppId", p."id"
FROM "PlanificacionAgricola" p JOIN "PlanificacionAgricolaLinea" l ON l."planificacionId" = p."id"
WHERE p."estado" = 'cerrada' AND p."escenarioOriginal"
  AND l."actividadAppId" IS NOT NULL AND l."protocoloId" IS NOT NULL AND l."hectareasPlanificadas" > 0;
COMMIT;
