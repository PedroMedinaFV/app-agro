CREATE TABLE "ZonaPlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT,
    "zonaErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaPlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampoPlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "campoErpId" TEXT,
    "zonaPlanificacionId" TEXT,
    "zonaErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampoPlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LotePlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "campoPlanificacionId" TEXT NOT NULL,
    "loteErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "superficieTotal" DOUBLE PRECISION NOT NULL,
    "superficieProductiva" DOUBLE PRECISION NOT NULL,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotePlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EspeciePlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "especieErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EspeciePlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActividadPlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "actividadErpId" TEXT,
    "especiePlanificacionId" TEXT,
    "especieErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActividadPlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsumoPlanificacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "insumoErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "tipo" TEXT,
    "unidad" TEXT NOT NULL,
    "precioUnitarioEstimado" DOUBLE PRECISION,
    "moneda" TEXT,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsumoPlanificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstadioFenologicoReferencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "idEstadio" INTEGER NOT NULL,
    "actividadErpId" TEXT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ordenCronologico" INTEGER NOT NULL,
    "empresaErpId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "origen" TEXT NOT NULL DEFAULT 'semilla',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadioFenologicoReferencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaborReferencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT,
    "servicioErpId" TEXT,
    "idServicio" INTEGER,
    "idTipoServicio" INTEGER,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcionAbreviada" TEXT,
    "idUnidadMedida" INTEGER,
    "idMoneda" INTEGER,
    "unidadSugerida" TEXT NOT NULL,
    "costoUnitarioSugerido" DOUBLE PRECISION,
    "imputaDosis" BOOLEAN,
    "estadoVinculacion" TEXT NOT NULL DEFAULT 'provisorio',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "origen" TEXT NOT NULL DEFAULT 'semilla',
    "fechaUltimaActualizacionErp" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborReferencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProtocoloProductivo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "protocoloOrigenId" TEXT,
    "empresaErpId" TEXT,
    "campaniaErpId" TEXT NOT NULL,
    "actividadPlanificacionId" TEXT,
    "actividadErpId" TEXT,
    "tipoFecha" TEXT NOT NULL,
    "fechaSiembra" TIMESTAMP(3),
    "zonaPlanificacionId" TEXT,
    "campoPlanificacionId" TEXT,
    "costoEstimadoPorHa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocoloProductivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProtocoloEtapa" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "estadioReferenciaId" TEXT,
    "estadioCodigo" TEXT,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaObjetivo" TIMESTAMP(3),
    "diasDesdeSiembra" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocoloEtapa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProtocoloLabor" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "laborReferenciaId" TEXT,
    "indiceAplicacion" DOUBLE PRECISION NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL,
    "cantidadPorHa" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "costoPorHa" DOUBLE PRECISION NOT NULL,
    "momentoEstimado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocoloLabor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProtocoloInsumo" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "indiceAplicacion" DOUBLE PRECISION NOT NULL,
    "insumoPlanificacionId" TEXT NOT NULL,
    "insumoErpId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "unidad" TEXT NOT NULL,
    "dosisPorHa" DOUBLE PRECISION NOT NULL,
    "precioUnitarioEstimado" DOUBLE PRECISION NOT NULL,
    "costoPorHa" DOUBLE PRECISION NOT NULL,
    "momentoEstimado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocoloInsumo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanificacionAgricola" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "campaniaErpId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "cerradaPor" TEXT,
    "cerradaAt" TIMESTAMP(3),
    "motivoCierre" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanificacionAgricola_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanificacionAgricolaLinea" (
    "id" TEXT NOT NULL,
    "planificacionId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "campoPlanificacionId" TEXT NOT NULL,
    "campoErpId" TEXT,
    "lotePlanificacionId" TEXT NOT NULL,
    "loteErpId" TEXT,
    "actividadPlanificacionId" TEXT NOT NULL,
    "actividadErpId" TEXT,
    "cultivoErpId" TEXT,
    "destinoReferenciaId" TEXT,
    "destinoVenta" TEXT NOT NULL,
    "destinoVentaManual" BOOLEAN NOT NULL DEFAULT false,
    "precioReferenciaId" TEXT,
    "precioVentaEstimado" DOUBLE PRECISION NOT NULL,
    "precioVentaManual" BOOLEAN NOT NULL DEFAULT false,
    "hectareasPlanificadas" DOUBLE PRECISION NOT NULL,
    "rindeEstimado" DOUBLE PRECISION NOT NULL,
    "gastosComercialesReferenciaId" TEXT,
    "gastosComercialesEstimados" DOUBLE PRECISION NOT NULL,
    "protocoloId" TEXT,
    "ingresoBrutoEstimado" DOUBLE PRECISION NOT NULL,
    "ingresoNetoEstimado" DOUBLE PRECISION NOT NULL,
    "costoProduccionEstimado" DOUBLE PRECISION NOT NULL,
    "margenBrutoEstimado" DOUBLE PRECISION NOT NULL,
    "margenBrutoActualizado" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanificacionAgricolaLinea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DestinoVentaReferencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "zonaErpId" TEXT,
    "campoPlanificacionId" TEXT,
    "campoErpId" TEXT,
    "actividadPlanificacionId" TEXT NOT NULL,
    "actividadErpId" TEXT,
    "especieErpId" TEXT,
    "cultivoErpId" TEXT,
    "destinoVenta" TEXT NOT NULL,
    "destinoVentaNormalizado" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinoVentaReferencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrecioReferencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT,
    "actividadPlanificacionId" TEXT NOT NULL,
    "actividadErpId" TEXT,
    "especiePlanificacionId" TEXT,
    "especieErpId" TEXT,
    "cultivoErpId" TEXT,
    "destinoVenta" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecioReferencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConceptoGastoComercial" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptoGastoComercial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GastosComercialesReferencia" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "campaniaErpId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "zonaPlanificacionId" TEXT,
    "zonaErpId" TEXT,
    "campoPlanificacionId" TEXT,
    "campoErpId" TEXT,
    "actividadPlanificacionId" TEXT NOT NULL,
    "actividadErpId" TEXT,
    "destinoVenta" TEXT,
    "descripcion" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastosComercialesReferencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VinculacionErpSugerida" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "empresaErpId" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadPlanificacionId" TEXT NOT NULL,
    "entidadErpId" TEXT NOT NULL,
    "entidadErpSnapshot" JSONB NOT NULL,
    "puntajeCoincidencia" DOUBLE PRECISION NOT NULL,
    "criterioCoincidencia" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "revisadaPor" TEXT,
    "revisadaAt" TIMESTAMP(3),
    "motivoResolucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VinculacionErpSugerida_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificacionUsuario" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'normal',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vinculacionSugeridaId" TEXT,
    "leidaAt" TIMESTAMP(3),
    "resueltaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificacionUsuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditoriaEvento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "usuarioId" TEXT,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "motivo" TEXT,
    "valoresAntes" JSONB,
    "valoresDespues" JSONB,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaEvento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstadioFenologicoReferencia_clienteId_idEstadio_key" ON "EstadioFenologicoReferencia"("clienteId", "idEstadio");
CREATE UNIQUE INDEX "LaborReferencia_clienteId_codigo_key" ON "LaborReferencia"("clienteId", "codigo");
CREATE UNIQUE INDEX "LaborReferencia_clienteId_servicioErpId_key" ON "LaborReferencia"("clienteId", "servicioErpId");
CREATE UNIQUE INDEX "ProtocoloEtapa_protocoloId_estadioReferenciaId_key" ON "ProtocoloEtapa"("protocoloId", "estadioReferenciaId");
CREATE UNIQUE INDEX "PlanificacionAgricolaLinea_planificacionId_campoPlanificacionId_lotePlanificacionId_actividadPlanificacionId_key" ON "PlanificacionAgricolaLinea"("planificacionId", "campoPlanificacionId", "lotePlanificacionId", "actividadPlanificacionId");
CREATE UNIQUE INDEX "VinculacionErpSugerida_clienteId_entidadTipo_entidadPlanificacionId_entidadErpId_key" ON "VinculacionErpSugerida"("clienteId", "entidadTipo", "entidadPlanificacionId", "entidadErpId");

CREATE INDEX "ZonaPlanificacion_clienteId_idx" ON "ZonaPlanificacion"("clienteId");
CREATE INDEX "ZonaPlanificacion_empresaErpId_idx" ON "ZonaPlanificacion"("empresaErpId");
CREATE INDEX "ZonaPlanificacion_zonaErpId_idx" ON "ZonaPlanificacion"("zonaErpId");
CREATE INDEX "ZonaPlanificacion_estadoVinculacion_idx" ON "ZonaPlanificacion"("estadoVinculacion");
CREATE INDEX "CampoPlanificacion_clienteId_idx" ON "CampoPlanificacion"("clienteId");
CREATE INDEX "CampoPlanificacion_empresaErpId_idx" ON "CampoPlanificacion"("empresaErpId");
CREATE INDEX "CampoPlanificacion_campoErpId_idx" ON "CampoPlanificacion"("campoErpId");
CREATE INDEX "CampoPlanificacion_zonaPlanificacionId_idx" ON "CampoPlanificacion"("zonaPlanificacionId");
CREATE INDEX "CampoPlanificacion_estadoVinculacion_idx" ON "CampoPlanificacion"("estadoVinculacion");
CREATE INDEX "LotePlanificacion_clienteId_idx" ON "LotePlanificacion"("clienteId");
CREATE INDEX "LotePlanificacion_campoPlanificacionId_idx" ON "LotePlanificacion"("campoPlanificacionId");
CREATE INDEX "LotePlanificacion_loteErpId_idx" ON "LotePlanificacion"("loteErpId");
CREATE INDEX "LotePlanificacion_estadoVinculacion_idx" ON "LotePlanificacion"("estadoVinculacion");
CREATE INDEX "EspeciePlanificacion_clienteId_idx" ON "EspeciePlanificacion"("clienteId");
CREATE INDEX "EspeciePlanificacion_empresaErpId_idx" ON "EspeciePlanificacion"("empresaErpId");
CREATE INDEX "EspeciePlanificacion_especieErpId_idx" ON "EspeciePlanificacion"("especieErpId");
CREATE INDEX "EspeciePlanificacion_estadoVinculacion_idx" ON "EspeciePlanificacion"("estadoVinculacion");
CREATE INDEX "ActividadPlanificacion_clienteId_idx" ON "ActividadPlanificacion"("clienteId");
CREATE INDEX "ActividadPlanificacion_empresaErpId_idx" ON "ActividadPlanificacion"("empresaErpId");
CREATE INDEX "ActividadPlanificacion_actividadErpId_idx" ON "ActividadPlanificacion"("actividadErpId");
CREATE INDEX "ActividadPlanificacion_especiePlanificacionId_idx" ON "ActividadPlanificacion"("especiePlanificacionId");
CREATE INDEX "ActividadPlanificacion_estadoVinculacion_idx" ON "ActividadPlanificacion"("estadoVinculacion");
CREATE INDEX "InsumoPlanificacion_clienteId_idx" ON "InsumoPlanificacion"("clienteId");
CREATE INDEX "InsumoPlanificacion_empresaErpId_idx" ON "InsumoPlanificacion"("empresaErpId");
CREATE INDEX "InsumoPlanificacion_insumoErpId_idx" ON "InsumoPlanificacion"("insumoErpId");
CREATE INDEX "InsumoPlanificacion_estadoVinculacion_idx" ON "InsumoPlanificacion"("estadoVinculacion");
CREATE INDEX "EstadioFenologicoReferencia_clienteId_idx" ON "EstadioFenologicoReferencia"("clienteId");
CREATE INDEX "EstadioFenologicoReferencia_actividadErpId_idx" ON "EstadioFenologicoReferencia"("actividadErpId");
CREATE INDEX "EstadioFenologicoReferencia_codigo_idx" ON "EstadioFenologicoReferencia"("codigo");
CREATE INDEX "EstadioFenologicoReferencia_ordenCronologico_idx" ON "EstadioFenologicoReferencia"("ordenCronologico");
CREATE INDEX "EstadioFenologicoReferencia_activo_idx" ON "EstadioFenologicoReferencia"("activo");
CREATE INDEX "LaborReferencia_clienteId_idx" ON "LaborReferencia"("clienteId");
CREATE INDEX "LaborReferencia_empresaErpId_idx" ON "LaborReferencia"("empresaErpId");
CREATE INDEX "LaborReferencia_servicioErpId_idx" ON "LaborReferencia"("servicioErpId");
CREATE INDEX "LaborReferencia_nombre_idx" ON "LaborReferencia"("nombre");
CREATE INDEX "LaborReferencia_estadoVinculacion_idx" ON "LaborReferencia"("estadoVinculacion");
CREATE INDEX "LaborReferencia_activo_idx" ON "LaborReferencia"("activo");
CREATE INDEX "ProtocoloProductivo_clienteId_idx" ON "ProtocoloProductivo"("clienteId");
CREATE INDEX "ProtocoloProductivo_campaniaErpId_idx" ON "ProtocoloProductivo"("campaniaErpId");
CREATE INDEX "ProtocoloProductivo_actividadPlanificacionId_idx" ON "ProtocoloProductivo"("actividadPlanificacionId");
CREATE INDEX "ProtocoloProductivo_actividadErpId_idx" ON "ProtocoloProductivo"("actividadErpId");
CREATE INDEX "ProtocoloProductivo_zonaPlanificacionId_idx" ON "ProtocoloProductivo"("zonaPlanificacionId");
CREATE INDEX "ProtocoloProductivo_campoPlanificacionId_idx" ON "ProtocoloProductivo"("campoPlanificacionId");
CREATE INDEX "ProtocoloProductivo_activo_idx" ON "ProtocoloProductivo"("activo");
CREATE INDEX "ProtocoloEtapa_protocoloId_idx" ON "ProtocoloEtapa"("protocoloId");
CREATE INDEX "ProtocoloEtapa_estadioReferenciaId_idx" ON "ProtocoloEtapa"("estadioReferenciaId");
CREATE INDEX "ProtocoloEtapa_orden_idx" ON "ProtocoloEtapa"("orden");
CREATE INDEX "ProtocoloLabor_etapaId_idx" ON "ProtocoloLabor"("etapaId");
CREATE INDEX "ProtocoloLabor_laborReferenciaId_idx" ON "ProtocoloLabor"("laborReferenciaId");
CREATE INDEX "ProtocoloLabor_indiceAplicacion_idx" ON "ProtocoloLabor"("indiceAplicacion");
CREATE INDEX "ProtocoloInsumo_etapaId_idx" ON "ProtocoloInsumo"("etapaId");
CREATE INDEX "ProtocoloInsumo_insumoPlanificacionId_idx" ON "ProtocoloInsumo"("insumoPlanificacionId");
CREATE INDEX "ProtocoloInsumo_insumoErpId_idx" ON "ProtocoloInsumo"("insumoErpId");
CREATE INDEX "ProtocoloInsumo_indiceAplicacion_idx" ON "ProtocoloInsumo"("indiceAplicacion");
CREATE INDEX "PlanificacionAgricola_clienteId_idx" ON "PlanificacionAgricola"("clienteId");
CREATE INDEX "PlanificacionAgricola_campaniaErpId_idx" ON "PlanificacionAgricola"("campaniaErpId");
CREATE INDEX "PlanificacionAgricola_estado_idx" ON "PlanificacionAgricola"("estado");
CREATE INDEX "PlanificacionAgricolaLinea_planificacionId_idx" ON "PlanificacionAgricolaLinea"("planificacionId");
CREATE INDEX "PlanificacionAgricolaLinea_campoPlanificacionId_idx" ON "PlanificacionAgricolaLinea"("campoPlanificacionId");
CREATE INDEX "PlanificacionAgricolaLinea_lotePlanificacionId_idx" ON "PlanificacionAgricolaLinea"("lotePlanificacionId");
CREATE INDEX "PlanificacionAgricolaLinea_actividadPlanificacionId_idx" ON "PlanificacionAgricolaLinea"("actividadPlanificacionId");
CREATE INDEX "PlanificacionAgricolaLinea_actividadErpId_idx" ON "PlanificacionAgricolaLinea"("actividadErpId");
CREATE INDEX "PlanificacionAgricolaLinea_protocoloId_idx" ON "PlanificacionAgricolaLinea"("protocoloId");
CREATE INDEX "DestinoVentaReferencia_clienteId_idx" ON "DestinoVentaReferencia"("clienteId");
CREATE INDEX "DestinoVentaReferencia_empresaErpId_idx" ON "DestinoVentaReferencia"("empresaErpId");
CREATE INDEX "DestinoVentaReferencia_campoPlanificacionId_idx" ON "DestinoVentaReferencia"("campoPlanificacionId");
CREATE INDEX "DestinoVentaReferencia_actividadPlanificacionId_idx" ON "DestinoVentaReferencia"("actividadPlanificacionId");
CREATE INDEX "DestinoVentaReferencia_actividadErpId_idx" ON "DestinoVentaReferencia"("actividadErpId");
CREATE INDEX "DestinoVentaReferencia_activo_idx" ON "DestinoVentaReferencia"("activo");
CREATE UNIQUE INDEX "DestinoVentaReferencia_clienteId_destinoVentaNormalizado_key" ON "DestinoVentaReferencia"("clienteId", "destinoVentaNormalizado");
CREATE INDEX "PrecioReferencia_clienteId_idx" ON "PrecioReferencia"("clienteId");
CREATE INDEX "PrecioReferencia_actividadPlanificacionId_idx" ON "PrecioReferencia"("actividadPlanificacionId");
CREATE INDEX "PrecioReferencia_actividadErpId_idx" ON "PrecioReferencia"("actividadErpId");
CREATE INDEX "PrecioReferencia_destinoVenta_idx" ON "PrecioReferencia"("destinoVenta");
CREATE INDEX "PrecioReferencia_activo_idx" ON "PrecioReferencia"("activo");
CREATE UNIQUE INDEX "ConceptoGastoComercial_clienteId_nombreNormalizado_key" ON "ConceptoGastoComercial"("clienteId", "nombreNormalizado");
CREATE INDEX "ConceptoGastoComercial_clienteId_idx" ON "ConceptoGastoComercial"("clienteId");
CREATE INDEX "ConceptoGastoComercial_codigo_idx" ON "ConceptoGastoComercial"("codigo");
CREATE INDEX "ConceptoGastoComercial_activo_idx" ON "ConceptoGastoComercial"("activo");
CREATE INDEX "GastosComercialesReferencia_clienteId_idx" ON "GastosComercialesReferencia"("clienteId");
CREATE INDEX "GastosComercialesReferencia_campaniaErpId_idx" ON "GastosComercialesReferencia"("campaniaErpId");
CREATE INDEX "GastosComercialesReferencia_empresaErpId_idx" ON "GastosComercialesReferencia"("empresaErpId");
CREATE INDEX "GastosComercialesReferencia_zonaPlanificacionId_idx" ON "GastosComercialesReferencia"("zonaPlanificacionId");
CREATE INDEX "GastosComercialesReferencia_campoPlanificacionId_idx" ON "GastosComercialesReferencia"("campoPlanificacionId");
CREATE INDEX "GastosComercialesReferencia_actividadPlanificacionId_idx" ON "GastosComercialesReferencia"("actividadPlanificacionId");
CREATE INDEX "GastosComercialesReferencia_actividadErpId_idx" ON "GastosComercialesReferencia"("actividadErpId");
CREATE INDEX "GastosComercialesReferencia_activo_idx" ON "GastosComercialesReferencia"("activo");
CREATE INDEX "VinculacionErpSugerida_clienteId_idx" ON "VinculacionErpSugerida"("clienteId");
CREATE INDEX "VinculacionErpSugerida_empresaErpId_idx" ON "VinculacionErpSugerida"("empresaErpId");
CREATE INDEX "VinculacionErpSugerida_entidadTipo_idx" ON "VinculacionErpSugerida"("entidadTipo");
CREATE INDEX "VinculacionErpSugerida_entidadPlanificacionId_idx" ON "VinculacionErpSugerida"("entidadPlanificacionId");
CREATE INDEX "VinculacionErpSugerida_entidadErpId_idx" ON "VinculacionErpSugerida"("entidadErpId");
CREATE INDEX "VinculacionErpSugerida_estado_idx" ON "VinculacionErpSugerida"("estado");
CREATE INDEX "VinculacionErpSugerida_puntajeCoincidencia_idx" ON "VinculacionErpSugerida"("puntajeCoincidencia");
CREATE INDEX "NotificacionUsuario_clienteId_idx" ON "NotificacionUsuario"("clienteId");
CREATE INDEX "NotificacionUsuario_usuarioId_idx" ON "NotificacionUsuario"("usuarioId");
CREATE INDEX "NotificacionUsuario_tipo_idx" ON "NotificacionUsuario"("tipo");
CREATE INDEX "NotificacionUsuario_estado_idx" ON "NotificacionUsuario"("estado");
CREATE INDEX "NotificacionUsuario_prioridad_idx" ON "NotificacionUsuario"("prioridad");
CREATE INDEX "NotificacionUsuario_vinculacionSugeridaId_idx" ON "NotificacionUsuario"("vinculacionSugeridaId");
CREATE INDEX "NotificacionUsuario_createdAt_idx" ON "NotificacionUsuario"("createdAt");
CREATE INDEX "AuditoriaEvento_clienteId_idx" ON "AuditoriaEvento"("clienteId");
CREATE INDEX "AuditoriaEvento_usuarioId_idx" ON "AuditoriaEvento"("usuarioId");
CREATE INDEX "AuditoriaEvento_entidad_idx" ON "AuditoriaEvento"("entidad");
CREATE INDEX "AuditoriaEvento_entidadId_idx" ON "AuditoriaEvento"("entidadId");
CREATE INDEX "AuditoriaEvento_accion_idx" ON "AuditoriaEvento"("accion");
CREATE INDEX "AuditoriaEvento_createdAt_idx" ON "AuditoriaEvento"("createdAt");

ALTER TABLE "ZonaPlanificacion" ADD CONSTRAINT "ZonaPlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampoPlanificacion" ADD CONSTRAINT "CampoPlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampoPlanificacion" ADD CONSTRAINT "CampoPlanificacion_zonaPlanificacionId_fkey" FOREIGN KEY ("zonaPlanificacionId") REFERENCES "ZonaPlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LotePlanificacion" ADD CONSTRAINT "LotePlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LotePlanificacion" ADD CONSTRAINT "LotePlanificacion_campoPlanificacionId_fkey" FOREIGN KEY ("campoPlanificacionId") REFERENCES "CampoPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EspeciePlanificacion" ADD CONSTRAINT "EspeciePlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActividadPlanificacion" ADD CONSTRAINT "ActividadPlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActividadPlanificacion" ADD CONSTRAINT "ActividadPlanificacion_especiePlanificacionId_fkey" FOREIGN KEY ("especiePlanificacionId") REFERENCES "EspeciePlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsumoPlanificacion" ADD CONSTRAINT "InsumoPlanificacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstadioFenologicoReferencia" ADD CONSTRAINT "EstadioFenologicoReferencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaborReferencia" ADD CONSTRAINT "LaborReferencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloProductivo" ADD CONSTRAINT "ProtocoloProductivo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloProductivo" ADD CONSTRAINT "ProtocoloProductivo_actividadPlanificacionId_fkey" FOREIGN KEY ("actividadPlanificacionId") REFERENCES "ActividadPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloProductivo" ADD CONSTRAINT "ProtocoloProductivo_zonaPlanificacionId_fkey" FOREIGN KEY ("zonaPlanificacionId") REFERENCES "ZonaPlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocoloProductivo" ADD CONSTRAINT "ProtocoloProductivo_campoPlanificacionId_fkey" FOREIGN KEY ("campoPlanificacionId") REFERENCES "CampoPlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocoloEtapa" ADD CONSTRAINT "ProtocoloEtapa_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "ProtocoloProductivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloEtapa" ADD CONSTRAINT "ProtocoloEtapa_estadioReferenciaId_fkey" FOREIGN KEY ("estadioReferenciaId") REFERENCES "EstadioFenologicoReferencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocoloLabor" ADD CONSTRAINT "ProtocoloLabor_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "ProtocoloEtapa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloLabor" ADD CONSTRAINT "ProtocoloLabor_laborReferenciaId_fkey" FOREIGN KEY ("laborReferenciaId") REFERENCES "LaborReferencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocoloInsumo" ADD CONSTRAINT "ProtocoloInsumo_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "ProtocoloEtapa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtocoloInsumo" ADD CONSTRAINT "ProtocoloInsumo_insumoPlanificacionId_fkey" FOREIGN KEY ("insumoPlanificacionId") REFERENCES "InsumoPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricola" ADD CONSTRAINT "PlanificacionAgricola_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricolaLinea" ADD CONSTRAINT "PlanificacionAgricolaLinea_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "PlanificacionAgricola"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricolaLinea" ADD CONSTRAINT "PlanificacionAgricolaLinea_campoPlanificacionId_fkey" FOREIGN KEY ("campoPlanificacionId") REFERENCES "CampoPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricolaLinea" ADD CONSTRAINT "PlanificacionAgricolaLinea_lotePlanificacionId_fkey" FOREIGN KEY ("lotePlanificacionId") REFERENCES "LotePlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricolaLinea" ADD CONSTRAINT "PlanificacionAgricolaLinea_actividadPlanificacionId_fkey" FOREIGN KEY ("actividadPlanificacionId") REFERENCES "ActividadPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanificacionAgricolaLinea" ADD CONSTRAINT "PlanificacionAgricolaLinea_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "ProtocoloProductivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DestinoVentaReferencia" ADD CONSTRAINT "DestinoVentaReferencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DestinoVentaReferencia" ADD CONSTRAINT "DestinoVentaReferencia_actividadPlanificacionId_fkey" FOREIGN KEY ("actividadPlanificacionId") REFERENCES "ActividadPlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrecioReferencia" ADD CONSTRAINT "PrecioReferencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrecioReferencia" ADD CONSTRAINT "PrecioReferencia_actividadPlanificacionId_fkey" FOREIGN KEY ("actividadPlanificacionId") REFERENCES "ActividadPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrecioReferencia" ADD CONSTRAINT "PrecioReferencia_especiePlanificacionId_fkey" FOREIGN KEY ("especiePlanificacionId") REFERENCES "EspeciePlanificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConceptoGastoComercial" ADD CONSTRAINT "ConceptoGastoComercial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GastosComercialesReferencia" ADD CONSTRAINT "GastosComercialesReferencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GastosComercialesReferencia" ADD CONSTRAINT "GastosComercialesReferencia_actividadPlanificacionId_fkey" FOREIGN KEY ("actividadPlanificacionId") REFERENCES "ActividadPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VinculacionErpSugerida" ADD CONSTRAINT "VinculacionErpSugerida_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificacionUsuario" ADD CONSTRAINT "NotificacionUsuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificacionUsuario" ADD CONSTRAINT "NotificacionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificacionUsuario" ADD CONSTRAINT "NotificacionUsuario_vinculacionSugeridaId_fkey" FOREIGN KEY ("vinculacionSugeridaId") REFERENCES "VinculacionErpSugerida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditoriaEvento" ADD CONSTRAINT "AuditoriaEvento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
