CREATE TABLE "ErpSincronizacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'en_proceso',
    "itemsSolicitados" JSONB NOT NULL,
    "itemsEjecutados" JSONB NOT NULL,
    "resultado" JSONB,
    "error" TEXT,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ErpSincronizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSincronizacionDetalle" (
    "id" TEXT NOT NULL,
    "sincronizacionId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "padron" TEXT NOT NULL,
    "registros" INTEGER NOT NULL DEFAULT 0,
    "omitidos" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'completada',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErpSincronizacionDetalle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErpSincronizacion_clienteId_idx" ON "ErpSincronizacion"("clienteId");
CREATE INDEX "ErpSincronizacion_usuarioId_idx" ON "ErpSincronizacion"("usuarioId");
CREATE INDEX "ErpSincronizacion_estado_idx" ON "ErpSincronizacion"("estado");
CREATE INDEX "ErpSincronizacion_iniciadoEn_idx" ON "ErpSincronizacion"("iniciadoEn");

CREATE INDEX "ErpSincronizacionDetalle_sincronizacionId_idx" ON "ErpSincronizacionDetalle"("sincronizacionId");
CREATE INDEX "ErpSincronizacionDetalle_empresaErpId_idx" ON "ErpSincronizacionDetalle"("empresaErpId");
CREATE INDEX "ErpSincronizacionDetalle_padron_idx" ON "ErpSincronizacionDetalle"("padron");
CREATE INDEX "ErpSincronizacionDetalle_estado_idx" ON "ErpSincronizacionDetalle"("estado");

ALTER TABLE "ErpSincronizacionDetalle"
ADD CONSTRAINT "ErpSincronizacionDetalle_sincronizacionId_fkey"
FOREIGN KEY ("sincronizacionId") REFERENCES "ErpSincronizacion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
