-- Registro operativo de precipitaciones cargadas desde mobile/web.
-- Se guarda por campo asignado, con lote opcional, para consulta y auditoria posterior.
CREATE TABLE "PrecipitacionCampo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "campoPlanificacionId" TEXT NOT NULL,
    "campoErpId" TEXT,
    "lotePlanificacionId" TEXT,
    "loteErpId" TEXT,
    "milimetros" DOUBLE PRECISION NOT NULL,
    "fechaEvento" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecipitacionCampo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrecipitacionCampo_clienteId_idx" ON "PrecipitacionCampo"("clienteId");
CREATE INDEX "PrecipitacionCampo_usuarioId_idx" ON "PrecipitacionCampo"("usuarioId");
CREATE INDEX "PrecipitacionCampo_campoPlanificacionId_idx" ON "PrecipitacionCampo"("campoPlanificacionId");
CREATE INDEX "PrecipitacionCampo_lotePlanificacionId_idx" ON "PrecipitacionCampo"("lotePlanificacionId");
CREATE INDEX "PrecipitacionCampo_fechaEvento_idx" ON "PrecipitacionCampo"("fechaEvento");
CREATE INDEX "PrecipitacionCampo_origen_idx" ON "PrecipitacionCampo"("origen");

ALTER TABLE "PrecipitacionCampo"
ADD CONSTRAINT "PrecipitacionCampo_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrecipitacionCampo"
ADD CONSTRAINT "PrecipitacionCampo_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrecipitacionCampo"
ADD CONSTRAINT "PrecipitacionCampo_campoPlanificacionId_fkey"
FOREIGN KEY ("campoPlanificacionId") REFERENCES "CampoPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrecipitacionCampo"
ADD CONSTRAINT "PrecipitacionCampo_lotePlanificacionId_fkey"
FOREIGN KEY ("lotePlanificacionId") REFERENCES "LotePlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
