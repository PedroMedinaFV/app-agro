-- Un propietario persistente por cliente. El token distingue intentos y protege
-- liberacion/recuperacion frente a trabajadores anteriores.
CREATE TABLE "ErpSincronizacionBloqueo" (
    "clienteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sincronizacionId" TEXT NOT NULL,
    "adquiridoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ErpSincronizacionBloqueo_pkey" PRIMARY KEY ("clienteId")
);
CREATE INDEX "ErpSincronizacionBloqueo_venceEn_idx" ON "ErpSincronizacionBloqueo"("venceEn");
