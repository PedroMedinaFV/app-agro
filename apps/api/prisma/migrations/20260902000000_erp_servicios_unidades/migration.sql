-- CreateTable
CREATE TABLE "ErpServicio" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idServicio" INTEGER NOT NULL,
    "idTipoServicio" INTEGER,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "descripcionAbreviada" TEXT,
    "idUnidadMedida" INTEGER,
    "idMoneda" INTEGER,
    "precioUnitario" DOUBLE PRECISION,
    "idMonedaPersonal" INTEGER,
    "importePersonal" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL,
    "imputaDosis" BOOLEAN NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpUnidadMedida" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idUnidadMedida" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoSifen" TEXT,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpUnidadMedida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErpServicio_erpId_key" ON "ErpServicio"("erpId");

-- CreateIndex
CREATE INDEX "ErpServicio_empresaErpId_idx" ON "ErpServicio"("empresaErpId");

-- CreateIndex
CREATE INDEX "ErpServicio_idServicio_idx" ON "ErpServicio"("idServicio");

-- CreateIndex
CREATE INDEX "ErpServicio_codigo_idx" ON "ErpServicio"("codigo");

-- CreateIndex
CREATE INDEX "ErpServicio_descripcion_idx" ON "ErpServicio"("descripcion");

-- CreateIndex
CREATE INDEX "ErpServicio_idTipoServicio_idx" ON "ErpServicio"("idTipoServicio");

-- CreateIndex
CREATE INDEX "ErpServicio_idUnidadMedida_idx" ON "ErpServicio"("idUnidadMedida");

-- CreateIndex
CREATE INDEX "ErpServicio_activo_idx" ON "ErpServicio"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "ErpUnidadMedida_erpId_key" ON "ErpUnidadMedida"("erpId");

-- CreateIndex
CREATE INDEX "ErpUnidadMedida_empresaErpId_idx" ON "ErpUnidadMedida"("empresaErpId");

-- CreateIndex
CREATE INDEX "ErpUnidadMedida_idUnidadMedida_idx" ON "ErpUnidadMedida"("idUnidadMedida");

-- CreateIndex
CREATE INDEX "ErpUnidadMedida_codigo_idx" ON "ErpUnidadMedida"("codigo");

-- CreateIndex
CREATE INDEX "ErpUnidadMedida_activo_idx" ON "ErpUnidadMedida"("activo");
