CREATE TABLE "ErpTipoInsumo" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idTipoInsumo" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigoCot" TEXT,
    "codigoSima" INTEGER,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "usaPadronEstandar" BOOLEAN NOT NULL,
    "idCuentaContable" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpTipoInsumo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpTipoServicio" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idTipoServicio" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "exigeInsumo" BOOLEAN NOT NULL,
    "disponibleOt" BOOLEAN NOT NULL,
    "disponibleCompras" BOOLEAN NOT NULL,
    "disponibleVentas" BOOLEAN NOT NULL,
    "categoria" TEXT,
    "idCuentaContable" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpTipoServicio_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InsumoApp" ADD COLUMN "idTipoInsumo" INTEGER;

CREATE UNIQUE INDEX "ErpTipoInsumo_erpId_key" ON "ErpTipoInsumo"("erpId");
CREATE INDEX "ErpTipoInsumo_empresaErpId_idx" ON "ErpTipoInsumo"("empresaErpId");
CREATE INDEX "ErpTipoInsumo_idTipoInsumo_idx" ON "ErpTipoInsumo"("idTipoInsumo");
CREATE INDEX "ErpTipoInsumo_codigo_idx" ON "ErpTipoInsumo"("codigo");
CREATE INDEX "ErpTipoInsumo_descripcion_idx" ON "ErpTipoInsumo"("descripcion");
CREATE INDEX "ErpTipoInsumo_activo_idx" ON "ErpTipoInsumo"("activo");

CREATE UNIQUE INDEX "ErpTipoServicio_erpId_key" ON "ErpTipoServicio"("erpId");
CREATE INDEX "ErpTipoServicio_empresaErpId_idx" ON "ErpTipoServicio"("empresaErpId");
CREATE INDEX "ErpTipoServicio_idTipoServicio_idx" ON "ErpTipoServicio"("idTipoServicio");
CREATE INDEX "ErpTipoServicio_codigo_idx" ON "ErpTipoServicio"("codigo");
CREATE INDEX "ErpTipoServicio_descripcion_idx" ON "ErpTipoServicio"("descripcion");

CREATE INDEX "InsumoApp_idTipoInsumo_idx" ON "InsumoApp"("idTipoInsumo");
