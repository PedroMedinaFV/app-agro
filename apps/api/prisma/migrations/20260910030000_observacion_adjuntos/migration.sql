CREATE TABLE "ObservacionAdjunto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "observacionId" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservacionAdjunto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ObservacionAdjunto_clienteId_storageBucket_storagePath_key"
ON "ObservacionAdjunto"("clienteId", "storageBucket", "storagePath");

CREATE INDEX "ObservacionAdjunto_clienteId_idx" ON "ObservacionAdjunto"("clienteId");
CREATE INDEX "ObservacionAdjunto_observacionId_idx" ON "ObservacionAdjunto"("observacionId");
CREATE INDEX "ObservacionAdjunto_estado_idx" ON "ObservacionAdjunto"("estado");
CREATE INDEX "ObservacionAdjunto_mimeType_idx" ON "ObservacionAdjunto"("mimeType");

ALTER TABLE "ObservacionAdjunto"
ADD CONSTRAINT "ObservacionAdjunto_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ObservacionAdjunto"
ADD CONSTRAINT "ObservacionAdjunto_observacionId_fkey"
FOREIGN KEY ("observacionId") REFERENCES "ObservacionCampo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
