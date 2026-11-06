-- Compatibilidad de replay sin modificar checksums de migraciones ya aplicadas.
-- En schemas que completaron 20261001181547_ no se modifica ningun objeto.
DO $$
DECLARE
  item text[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations"
    WHERE migration_name = '20261001181547_' AND finished_at IS NOT NULL AND rolled_back_at IS NULL
  ) THEN
    RETURN;
  END IF;

  -- Una migracion previa consulta pg_constraint sin restringir schema; una FK
  -- homonima en otra instalacion puede impedir el rename en este schema nuevo.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"PrecioApp"'::regclass AND conname = 'PrecioApp_actividadAppId_fkey') THEN
    FOREACH item SLICE 1 IN ARRAY ARRAY[
      ARRAY['PrecioReferencia_actividadAppId_fkey'],
      ARRAY['PrecioReferencia_actividadPlanificacionId_fkey']
    ] LOOP
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"PrecioApp"'::regclass AND conname = item[1]) THEN
        EXECUTE format('ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I', current_schema(), 'PrecioApp', item[1], 'PrecioApp_actividadAppId_fkey');
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Preparar los nombres que espera la siguiente migracion de normalizacion.
  -- Se consulta exclusivamente el objeto del schema actual, nunca otro schema.
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['ActividadApp', 'ActividadPlanificacion_pkey', 'ActividadApp_pkey'],
    ARRAY['CampoApp', 'CampoPlanificacion_pkey', 'CampoApp_pkey'],
    ARRAY['ConceptoGastoComercialApp', 'ConceptoGastoComercial_pkey', 'ConceptoGastoComercialApp_pkey'],
    ARRAY['EspecieApp', 'EspeciePlanificacion_pkey', 'EspecieApp_pkey'],
    ARRAY['GastoComercialApp', 'GastosComercialesReferencia_pkey', 'GastoComercialApp_pkey'],
    ARRAY['InsumoApp', 'InsumoPlanificacion_pkey', 'InsumoApp_pkey'],
    ARRAY['LoteApp', 'LotePlanificacion_pkey', 'LoteApp_pkey'],
    ARRAY['ServicioApp', 'LaborReferencia_pkey', 'ServicioApp_pkey'],
    ARRAY['ZonaApp', 'ZonaPlanificacion_pkey', 'ZonaApp_pkey'],
    ARRAY['ActividadApp', 'ActividadPlanificacion_clienteId_fkey', 'ActividadApp_clienteId_fkey'],
    ARRAY['ActividadApp', 'ActividadPlanificacion_especiePlanificacionId_fkey', 'ActividadApp_especieAppId_fkey'],
    ARRAY['CampoApp', 'CampoPlanificacion_clienteId_fkey', 'CampoApp_clienteId_fkey'],
    ARRAY['CampoApp', 'CampoPlanificacion_zonaPlanificacionId_fkey', 'CampoApp_zonaAppId_fkey'],
    ARRAY['ConceptoGastoComercialApp', 'ConceptoGastoComercial_clienteId_fkey', 'ConceptoGastoComercialApp_clienteId_fkey'],
    ARRAY['EspecieApp', 'EspeciePlanificacion_clienteId_fkey', 'EspecieApp_clienteId_fkey'],
    ARRAY['GastoComercialApp', 'GastosComercialesReferencia_actividadPlanificacionId_fkey', 'GastoComercialApp_actividadAppId_fkey'],
    ARRAY['GastoComercialApp', 'GastosComercialesReferencia_clienteId_fkey', 'GastoComercialApp_clienteId_fkey'],
    ARRAY['InsumoApp', 'InsumoPlanificacion_clienteId_fkey', 'InsumoApp_clienteId_fkey'],
    ARRAY['LoteApp', 'LotePlanificacion_campoPlanificacionId_fkey', 'LoteApp_campoAppId_fkey'],
    ARRAY['LoteApp', 'LotePlanificacion_clienteId_fkey', 'LoteApp_clienteId_fkey'],
    ARRAY['PlanificacionAgricolaLinea', 'PlanificacionAgricolaLinea_actividadPlanificacionId_fkey', 'PlanificacionAgricolaLinea_actividadAppId_fkey'],
    ARRAY['PlanificacionAgricolaLinea', 'PlanificacionAgricolaLinea_campoPlanificacionId_fkey', 'PlanificacionAgricolaLinea_campoAppId_fkey'],
    ARRAY['PlanificacionAgricolaLinea', 'PlanificacionAgricolaLinea_lotePlanificacionId_fkey', 'PlanificacionAgricolaLinea_loteAppId_fkey'],
    ARRAY['PrecipitacionCampo', 'PrecipitacionCampo_campoPlanificacionId_fkey', 'PrecipitacionCampo_campoAppId_fkey'],
    ARRAY['PrecipitacionCampo', 'PrecipitacionCampo_lotePlanificacionId_fkey', 'PrecipitacionCampo_loteAppId_fkey'],
    ARRAY['ProtocoloInsumo', 'ProtocoloInsumo_insumoPlanificacionId_fkey', 'ProtocoloInsumo_insumoAppId_fkey'],
    ARRAY['ProtocoloProductivo', 'ProtocoloProductivo_actividadPlanificacionId_fkey', 'ProtocoloProductivo_actividadAppId_fkey'],
    ARRAY['ProtocoloProductivo', 'ProtocoloProductivo_campoPlanificacionId_fkey', 'ProtocoloProductivo_campoAppId_fkey'],
    ARRAY['ProtocoloProductivo', 'ProtocoloProductivo_zonaPlanificacionId_fkey', 'ProtocoloProductivo_zonaAppId_fkey'],
    ARRAY['ServicioApp', 'LaborReferencia_clienteId_fkey', 'ServicioApp_clienteId_fkey'],
    ARRAY['ZonaApp', 'ZonaPlanificacion_clienteId_fkey', 'ZonaApp_clienteId_fkey']
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('%I.%I', current_schema(), item[1])) AND conname = item[2])
       AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('%I.%I', current_schema(), item[1])) AND conname = item[3]) THEN
      EXECUTE format('ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I', current_schema(), item[1], item[3], item[2]);
    END IF;
  END LOOP;

  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['ActividadPlanificacion_actividadErpId_idx', 'ActividadApp_actividadErpId_idx'],
    ARRAY['ActividadPlanificacion_clienteId_idx', 'ActividadApp_clienteId_idx'],
    ARRAY['ActividadPlanificacion_empresaErpId_idx', 'ActividadApp_empresaErpId_idx'],
    ARRAY['ActividadPlanificacion_especiePlanificacionId_idx', 'ActividadApp_especieAppId_idx'],
    ARRAY['ActividadPlanificacion_estadoVinculacion_idx', 'ActividadApp_estadoVinculacion_idx'],
    ARRAY['CampoPlanificacion_campoErpId_idx', 'CampoApp_campoErpId_idx'],
    ARRAY['CampoPlanificacion_clienteId_idx', 'CampoApp_clienteId_idx'],
    ARRAY['CampoPlanificacion_empresaErpId_idx', 'CampoApp_empresaErpId_idx'],
    ARRAY['CampoPlanificacion_estadoVinculacion_idx', 'CampoApp_estadoVinculacion_idx'],
    ARRAY['CampoPlanificacion_zonaPlanificacionId_idx', 'CampoApp_zonaAppId_idx'],
    ARRAY['ConceptoGastoComercial_activo_idx', 'ConceptoGastoComercialApp_activo_idx'],
    ARRAY['ConceptoGastoComercial_clienteId_idx', 'ConceptoGastoComercialApp_clienteId_idx'],
    ARRAY['ConceptoGastoComercial_clienteId_nombreNormalizado_key', 'ConceptoGastoComercialApp_clienteId_nombreNormalizado_key'],
    ARRAY['ConceptoGastoComercial_codigo_idx', 'ConceptoGastoComercialApp_codigo_idx'],
    ARRAY['EspeciePlanificacion_clienteId_idx', 'EspecieApp_clienteId_idx'],
    ARRAY['EspeciePlanificacion_empresaErpId_idx', 'EspecieApp_empresaErpId_idx'],
    ARRAY['EspeciePlanificacion_especieErpId_idx', 'EspecieApp_especieErpId_idx'],
    ARRAY['EspeciePlanificacion_estadoVinculacion_idx', 'EspecieApp_estadoVinculacion_idx'],
    ARRAY['GastosComercialesReferencia_actividadErpId_idx', 'GastoComercialApp_actividadErpId_idx'],
    ARRAY['GastosComercialesReferencia_actividadPlanificacionId_idx', 'GastoComercialApp_actividadAppId_idx'],
    ARRAY['GastosComercialesReferencia_activo_idx', 'GastoComercialApp_activo_idx'],
    ARRAY['GastosComercialesReferencia_campaniaErpId_idx', 'GastoComercialApp_campaniaErpId_idx'],
    ARRAY['GastosComercialesReferencia_campoPlanificacionId_idx', 'GastoComercialApp_campoAppId_idx'],
    ARRAY['GastosComercialesReferencia_clienteId_idx', 'GastoComercialApp_clienteId_idx'],
    ARRAY['GastosComercialesReferencia_empresaErpId_idx', 'GastoComercialApp_empresaErpId_idx'],
    ARRAY['GastosComercialesReferencia_zonaPlanificacionId_idx', 'GastoComercialApp_zonaAppId_idx'],
    ARRAY['InsumoPlanificacion_clienteId_idx', 'InsumoApp_clienteId_idx'],
    ARRAY['InsumoPlanificacion_empresaErpId_idx', 'InsumoApp_empresaErpId_idx'],
    ARRAY['InsumoPlanificacion_estadoVinculacion_idx', 'InsumoApp_estadoVinculacion_idx'],
    ARRAY['InsumoPlanificacion_insumoErpId_idx', 'InsumoApp_insumoErpId_idx'],
    ARRAY['LotePlanificacion_campoPlanificacionId_idx', 'LoteApp_campoAppId_idx'],
    ARRAY['LotePlanificacion_clienteId_idx', 'LoteApp_clienteId_idx'],
    ARRAY['LotePlanificacion_estadoVinculacion_idx', 'LoteApp_estadoVinculacion_idx'],
    ARRAY['LotePlanificacion_loteErpId_idx', 'LoteApp_loteErpId_idx'],
    ARRAY['PlanificacionAgricolaLinea_actividadPlanificacionId_idx', 'PlanificacionAgricolaLinea_actividadAppId_idx'],
    ARRAY['PlanificacionAgricolaLinea_campoPlanificacionId_idx', 'PlanificacionAgricolaLinea_campoAppId_idx'],
    ARRAY['PlanificacionAgricolaLinea_lotePlanificacionId_idx', 'PlanificacionAgricolaLinea_loteAppId_idx'],
    ARRAY['PlanificacionAgricolaLinea_planificacionId_campoPlanificacionId', 'PlanificacionAgricolaLinea_planificacionId_campoAppId_loteA_key'],
    ARRAY['PrecioReferencia_actividadErpId_idx', 'PrecioApp_actividadErpId_idx'],
    ARRAY['PrecioReferencia_actividadPlanificacionId_idx', 'PrecioApp_actividadAppId_idx'],
    ARRAY['PrecioReferencia_activo_idx', 'PrecioApp_activo_idx'],
    ARRAY['PrecioReferencia_clienteId_idx', 'PrecioApp_clienteId_idx'],
    ARRAY['PrecioReferencia_destinoVenta_idx', 'PrecioApp_destinoVenta_idx'],
    ARRAY['PrecipitacionCampo_campoPlanificacionId_idx', 'PrecipitacionCampo_campoAppId_idx'],
    ARRAY['PrecipitacionCampo_lotePlanificacionId_idx', 'PrecipitacionCampo_loteAppId_idx'],
    ARRAY['ProtocoloInsumo_insumoPlanificacionId_idx', 'ProtocoloInsumo_insumoAppId_idx'],
    ARRAY['ProtocoloProductivo_actividadPlanificacionId_idx', 'ProtocoloProductivo_actividadAppId_idx'],
    ARRAY['ProtocoloProductivo_campoPlanificacionId_idx', 'ProtocoloProductivo_campoAppId_idx'],
    ARRAY['ProtocoloProductivo_zonaPlanificacionId_idx', 'ProtocoloProductivo_zonaAppId_idx'],
    ARRAY['LaborReferencia_activo_idx', 'ServicioApp_activo_idx'],
    ARRAY['LaborReferencia_clienteId_codigo_key', 'ServicioApp_clienteId_codigo_key'],
    ARRAY['LaborReferencia_clienteId_idx', 'ServicioApp_clienteId_idx'],
    ARRAY['LaborReferencia_clienteId_servicioErpId_key', 'ServicioApp_clienteId_servicioErpId_key'],
    ARRAY['LaborReferencia_empresaErpId_idx', 'ServicioApp_empresaErpId_idx'],
    ARRAY['LaborReferencia_estadoVinculacion_idx', 'ServicioApp_estadoVinculacion_idx'],
    ARRAY['LaborReferencia_nombre_idx', 'ServicioApp_nombre_idx'],
    ARRAY['LaborReferencia_servicioErpId_idx', 'ServicioApp_servicioErpId_idx'],
    ARRAY['VinculacionErpSugerida_clienteId_entidadTipo_entidadPlanificaci', 'VinculacionErpSugerida_clienteId_entidadTipo_entidadPlanifi_key'],
    ARRAY['ZonaPlanificacion_clienteId_idx', 'ZonaApp_clienteId_idx'],
    ARRAY['ZonaPlanificacion_empresaErpId_idx', 'ZonaApp_empresaErpId_idx'],
    ARRAY['ZonaPlanificacion_estadoVinculacion_idx', 'ZonaApp_estadoVinculacion_idx'],
    ARRAY['ZonaPlanificacion_zonaErpId_idx', 'ZonaApp_zonaErpId_idx']
  ] LOOP
    IF to_regclass(format('%I.%I', current_schema(), item[1])) IS NULL
       AND to_regclass(format('%I.%I', current_schema(), item[2])) IS NOT NULL THEN
      EXECUTE format('ALTER INDEX %I.%I RENAME TO %I', current_schema(), item[2], item[1]);
    END IF;
  END LOOP;
END $$;