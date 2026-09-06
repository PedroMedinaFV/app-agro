ALTER TABLE "PlanificacionAgricola" ADD COLUMN "escenarioOriginal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlanificacionAgricola" ADD COLUMN "escenarioBloqueadoPorId" TEXT;

CREATE INDEX "PlanificacionAgricola_escenarioOriginal_idx" ON "PlanificacionAgricola"("escenarioOriginal");
CREATE INDEX "PlanificacionAgricola_escenarioBloqueadoPorId_idx" ON "PlanificacionAgricola"("escenarioBloqueadoPorId");
