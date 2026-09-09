ALTER TABLE "PrecipitacionCampo" ADD COLUMN "registroMovilId" TEXT;

CREATE INDEX "PrecipitacionCampo_registroMovilId_idx"
ON "PrecipitacionCampo"("registroMovilId");

CREATE UNIQUE INDEX "PrecipitacionCampo_clienteId_registroMovilId_key"
ON "PrecipitacionCampo"("clienteId", "registroMovilId");
