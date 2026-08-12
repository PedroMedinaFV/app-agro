CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "password" TEXT,
    "microsoftId" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "clienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegracionErp" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "baseUrl" TEXT,
    "authMode" TEXT NOT NULL DEFAULT 'mock',
    "apiKeyHeader" TEXT NOT NULL DEFAULT 'x-api-key',
    "apiKeyCifrada" TEXT,
    "bearerTokenCifrado" TEXT,
    "usernameCifrado" TEXT,
    "passwordCifrada" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoTestOk" BOOLEAN,
    "ultimoTestEn" TIMESTAMP(3),
    "ultimoSyncEn" TIMESTAMP(3),
    "configuradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracionErp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsuarioCampoErp" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "campoErpId" TEXT NOT NULL,
    "asignadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCampoErp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteEmpresaErp" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "asignadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteEmpresaErp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pais" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "paisId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "campoId" TEXT NOT NULL,
    "tipoSemilla" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cultivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Cultivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Labor" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "Labor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalisisSuelo" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "ph" DOUBLE PRECISION,
    "materiaOrganica" DOUBLE PRECISION,
    "nitrogeno" DOUBLE PRECISION,
    "fosforo" DOUBLE PRECISION,
    "potasio" DOUBLE PRECISION,
    "notas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisSuelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvanceSiembra" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvanceSiembra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvanceCosecha" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tonelaje" DOUBLE PRECISION NOT NULL,
    "humedad" DOUBLE PRECISION,
    "camion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvanceCosecha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Monitoreo" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT,
    "notas" TEXT,
    "coordenadas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Monitoreo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpCampo" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idCampo" INTEGER NOT NULL,
    "idZona" INTEGER,
    "idSubZona" INTEGER,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "paisCodigo" TEXT,
    "sociedad" TEXT,
    "admiteGanaderia" BOOLEAN,
    "domicilio" TEXT,
    "codigoSima" INTEGER,
    "idLocalidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpCampo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpZona" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idZona" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpZona_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpLote" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idLote" INTEGER NOT NULL,
    "idCampo" INTEGER NOT NULL,
    "campoErpId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cultivoCodigo" TEXT,
    "cultivoNombre" TEXT,
    "areaHectareas" DOUBLE PRECISION NOT NULL,
    "hectareasProductivas" DOUBLE PRECISION,
    "admiteGanaderia" BOOLEAN,
    "admiteLecheria" BOOLEAN,
    "codigoSima" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpLote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpActividad" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idActividad" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "habilitadoExportacionCrea" BOOLEAN NOT NULL,
    "idEspecie" INTEGER,
    "idTipoActividad" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpActividad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpEspecie" (
    "id" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idEspecie" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "codigoCot" TEXT,
    "codigoAfip" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpEspecie_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpEmpresa" (
    "id" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "idEmpresa" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL,
    "cuit" TEXT,
    "razonSocial" TEXT,
    "email" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpEmpresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_microsoftId_key" ON "Usuario"("microsoftId");
CREATE UNIQUE INDEX "IntegracionErp_clienteId_key" ON "IntegracionErp"("clienteId");
CREATE INDEX "IntegracionErp_activo_idx" ON "IntegracionErp"("activo");
CREATE UNIQUE INDEX "UsuarioCampoErp_clienteId_usuarioId_campoErpId_key" ON "UsuarioCampoErp"("clienteId", "usuarioId", "campoErpId");
CREATE INDEX "UsuarioCampoErp_clienteId_idx" ON "UsuarioCampoErp"("clienteId");
CREATE INDEX "UsuarioCampoErp_usuarioId_idx" ON "UsuarioCampoErp"("usuarioId");
CREATE INDEX "UsuarioCampoErp_campoErpId_idx" ON "UsuarioCampoErp"("campoErpId");
CREATE UNIQUE INDEX "ClienteEmpresaErp_clienteId_empresaErpId_key" ON "ClienteEmpresaErp"("clienteId", "empresaErpId");
CREATE INDEX "ClienteEmpresaErp_clienteId_idx" ON "ClienteEmpresaErp"("clienteId");
CREATE INDEX "ClienteEmpresaErp_empresaErpId_idx" ON "ClienteEmpresaErp"("empresaErpId");
CREATE UNIQUE INDEX "Pais_codigo_key" ON "Pais"("codigo");
CREATE UNIQUE INDEX "ErpCampo_erpId_key" ON "ErpCampo"("erpId");
CREATE INDEX "ErpCampo_codigo_idx" ON "ErpCampo"("codigo");
CREATE INDEX "ErpCampo_activo_idx" ON "ErpCampo"("activo");
CREATE INDEX "ErpCampo_empresaErpId_idx" ON "ErpCampo"("empresaErpId");
CREATE UNIQUE INDEX "ErpZona_erpId_key" ON "ErpZona"("erpId");
CREATE INDEX "ErpZona_codigo_idx" ON "ErpZona"("codigo");
CREATE INDEX "ErpZona_activo_idx" ON "ErpZona"("activo");
CREATE INDEX "ErpZona_empresaErpId_idx" ON "ErpZona"("empresaErpId");
CREATE UNIQUE INDEX "ErpLote_erpId_key" ON "ErpLote"("erpId");
CREATE INDEX "ErpLote_idLote_idx" ON "ErpLote"("idLote");
CREATE INDEX "ErpLote_idCampo_idx" ON "ErpLote"("idCampo");
CREATE INDEX "ErpLote_campoErpId_idx" ON "ErpLote"("campoErpId");
CREATE INDEX "ErpLote_codigo_idx" ON "ErpLote"("codigo");
CREATE INDEX "ErpLote_activo_idx" ON "ErpLote"("activo");
CREATE INDEX "ErpLote_empresaErpId_idx" ON "ErpLote"("empresaErpId");
CREATE UNIQUE INDEX "ErpActividad_erpId_key" ON "ErpActividad"("erpId");
CREATE INDEX "ErpActividad_idActividad_idx" ON "ErpActividad"("idActividad");
CREATE INDEX "ErpActividad_idTipoActividad_idx" ON "ErpActividad"("idTipoActividad");
CREATE INDEX "ErpActividad_activo_idx" ON "ErpActividad"("activo");
CREATE INDEX "ErpActividad_empresaErpId_idx" ON "ErpActividad"("empresaErpId");
CREATE UNIQUE INDEX "ErpEspecie_erpId_key" ON "ErpEspecie"("erpId");
CREATE INDEX "ErpEspecie_idEspecie_idx" ON "ErpEspecie"("idEspecie");
CREATE INDEX "ErpEspecie_codigo_idx" ON "ErpEspecie"("codigo");
CREATE INDEX "ErpEspecie_activo_idx" ON "ErpEspecie"("activo");
CREATE INDEX "ErpEspecie_empresaErpId_idx" ON "ErpEspecie"("empresaErpId");
CREATE UNIQUE INDEX "ErpEmpresa_erpId_key" ON "ErpEmpresa"("erpId");
CREATE INDEX "ErpEmpresa_idEmpresa_idx" ON "ErpEmpresa"("idEmpresa");
CREATE INDEX "ErpEmpresa_codigo_idx" ON "ErpEmpresa"("codigo");
CREATE INDEX "ErpEmpresa_activo_idx" ON "ErpEmpresa"("activo");

ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegracionErp" ADD CONSTRAINT "IntegracionErp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsuarioCampoErp" ADD CONSTRAINT "UsuarioCampoErp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsuarioCampoErp" ADD CONSTRAINT "UsuarioCampoErp_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClienteEmpresaErp" ADD CONSTRAINT "ClienteEmpresaErp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campo" ADD CONSTRAINT "Campo_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campo" ADD CONSTRAINT "Campo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "Campo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "Cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Labor" ADD CONSTRAINT "Labor_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalisisSuelo" ADD CONSTRAINT "AnalisisSuelo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvanceSiembra" ADD CONSTRAINT "AvanceSiembra_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvanceCosecha" ADD CONSTRAINT "AvanceCosecha_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Monitoreo" ADD CONSTRAINT "Monitoreo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ErpLote" ADD CONSTRAINT "ErpLote_campoErpId_fkey" FOREIGN KEY ("campoErpId") REFERENCES "ErpCampo"("erpId") ON DELETE RESTRICT ON UPDATE CASCADE;
