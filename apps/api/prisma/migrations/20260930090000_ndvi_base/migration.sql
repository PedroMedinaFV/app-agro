CREATE TABLE "LoteMapaNdvi" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "loteAppId" TEXT NOT NULL,
  "loteErpId" TEXT,
  "campoAppId" TEXT NOT NULL,
  "campoErpId" TEXT,
  "campaniaErpId" TEXT,
  "fechaImagen" TIMESTAMP(3) NOT NULL,
  "fechaProcesamiento" TIMESTAMP(3),
  "proveedor" TEXT NOT NULL,
  "origen" TEXT NOT NULL,
  "resolucionMetros" DOUBLE PRECISION,
  "nubosidadPorcentaje" DOUBLE PRECISION,
  "ndviPromedio" DOUBLE PRECISION,
  "ndviMinimo" DOUBLE PRECISION,
  "ndviMaximo" DOUBLE PRECISION,
  "ndviDesvio" DOUBLE PRECISION,
  "superficieAnalizadaHa" DOUBLE PRECISION,
  "storageBucket" TEXT,
  "storagePathRaster" TEXT,
  "storagePathPreview" TEXT,
  "storagePathTiles" TEXT,
  "bboxGeoJson" JSONB,
  "metadata" JSONB,
  "estado" TEXT NOT NULL DEFAULT 'pendiente_procesamiento',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoteMapaNdvi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoteMapaNdvi_clienteId_idx" ON "LoteMapaNdvi"("clienteId");
CREATE INDEX "LoteMapaNdvi_loteAppId_idx" ON "LoteMapaNdvi"("loteAppId");
CREATE INDEX "LoteMapaNdvi_campoAppId_idx" ON "LoteMapaNdvi"("campoAppId");
CREATE INDEX "LoteMapaNdvi_fechaImagen_idx" ON "LoteMapaNdvi"("fechaImagen");
CREATE INDEX "LoteMapaNdvi_estado_idx" ON "LoteMapaNdvi"("estado");
CREATE INDEX "LoteMapaNdvi_clienteId_loteAppId_fechaImagen_idx" ON "LoteMapaNdvi"("clienteId", "loteAppId", "fechaImagen");
CREATE UNIQUE INDEX "LoteMapaNdvi_clienteId_storageBucket_storagePathRaster_key" ON "LoteMapaNdvi"("clienteId", "storageBucket", "storagePathRaster");

ALTER TABLE "LoteMapaNdvi"
  ADD CONSTRAINT "LoteMapaNdvi_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoteMapaNdvi"
  ADD CONSTRAINT "LoteMapaNdvi_loteAppId_fkey"
  FOREIGN KEY ("loteAppId") REFERENCES "LoteApp"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoteMapaNdvi"
  ADD CONSTRAINT "LoteMapaNdvi_campoAppId_fkey"
  FOREIGN KEY ("campoAppId") REFERENCES "CampoApp"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
