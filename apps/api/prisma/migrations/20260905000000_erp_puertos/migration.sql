-- CreateTable
CREATE TABLE "ErpPuerto" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idPuerto" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpPuerto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErpPuerto_erpId_key" ON "ErpPuerto"("erpId");

-- CreateIndex
CREATE INDEX "ErpPuerto_empresaErpId_idx" ON "ErpPuerto"("empresaErpId");

-- CreateIndex
CREATE INDEX "ErpPuerto_idPuerto_idx" ON "ErpPuerto"("idPuerto");

-- CreateIndex
CREATE INDEX "ErpPuerto_codigo_idx" ON "ErpPuerto"("codigo");

-- CreateIndex
CREATE INDEX "ErpPuerto_nombre_idx" ON "ErpPuerto"("nombre");

-- CreateIndex
CREATE INDEX "ErpPuerto_activo_idx" ON "ErpPuerto"("activo");
