CREATE TABLE "LoteArchivoGeografico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "loteAppId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente_procesamiento',
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "geometriaGeoJson" JSONB,
    "superficieCalculadaHa" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoteArchivoGeografico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoteArchivoGeografico_clienteId_idx" ON "LoteArchivoGeografico"("clienteId");
CREATE INDEX "LoteArchivoGeografico_loteAppId_idx" ON "LoteArchivoGeografico"("loteAppId");
CREATE INDEX "LoteArchivoGeografico_estado_idx" ON "LoteArchivoGeografico"("estado");
CREATE UNIQUE INDEX "LoteArchivoGeografico_clienteId_storageBucket_storagePath_key" ON "LoteArchivoGeografico"("clienteId", "storageBucket", "storagePath");

ALTER TABLE "LoteArchivoGeografico"
ADD CONSTRAINT "LoteArchivoGeografico_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoteArchivoGeografico"
ADD CONSTRAINT "LoteArchivoGeografico_loteAppId_fkey"
FOREIGN KEY ("loteAppId") REFERENCES "LoteApp"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
