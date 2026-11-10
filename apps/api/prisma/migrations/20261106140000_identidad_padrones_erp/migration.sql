BEGIN;

CREATE TABLE "AliasPadronApp" (
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anteriorId" TEXT NOT NULL,
    "actualId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AliasPadronApp_pkey" PRIMARY KEY ("clienteId", "tipo", "anteriorId")
);
CREATE INDEX "AliasPadronApp_clienteId_tipo_actualId_idx" ON "AliasPadronApp"("clienteId", "tipo", "actualId");

-- Fallar explicitamente si existen duplicados previos; no elegir ni borrar datos automaticamente.
CREATE UNIQUE INDEX "ZonaApp_clienteId_zonaErpId_key" ON "ZonaApp"("clienteId", "zonaErpId");
CREATE UNIQUE INDEX "CampoApp_clienteId_campoErpId_key" ON "CampoApp"("clienteId", "campoErpId");
CREATE UNIQUE INDEX "LoteApp_clienteId_loteErpId_key" ON "LoteApp"("clienteId", "loteErpId");
CREATE UNIQUE INDEX "EspecieApp_clienteId_especieErpId_key" ON "EspecieApp"("clienteId", "especieErpId");
CREATE UNIQUE INDEX "ActividadApp_clienteId_actividadErpId_key" ON "ActividadApp"("clienteId", "actividadErpId");
CREATE UNIQUE INDEX "InsumoApp_clienteId_insumoErpId_key" ON "InsumoApp"("clienteId", "insumoErpId");

COMMIT;
