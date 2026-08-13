# Integracion ERP

## Rol del ERP

El ERP sera la fuente principal de datos maestros. Agro App no debe duplicar la gestion completa del ERP; debe consumir datos, hacerlos disponibles para uso web/mobile y, mas adelante, enviar novedades generadas en campo.

## Datos iniciales de entrada

### Padrones/Zonas

El contrato de `Padrones/Zonas` trae:

- `idZona`
- `codigo`
- `nombre`
- `activo`

Para zonas, `erpId` se deriva como `zona:${idZona}`.

### Padrones/Campos

El primer contrato mock simula respuestas reales del ERP. Para `Padrones/Campos`, la respuesta tiene esta forma general:

- `succeeded`
- `message`
- `errors`
- `pagination`
- `data`

Cada item de `data` trae campos como:

- `idCampo`
- `idZona`
- `idSubZona`
- `codigo`
- `nombre`
- `activo`
- `admiteGanaderia`
- `domicilio`
- `codigoSima`
- `idLocalidad`
- `fechaUltimaActualizacion`

Estos datos llegan con un identificador externo estable `erpId`. Ese ID es obligatorio para evitar duplicados y poder reconciliar cambios futuros.

Para campos, `erpId` se deriva como `campo:${idCampo}`.

### Padrones/Lotes

El contrato de `Padrones/Lotes` trae:

- `idLote`
- `idCampo`
- `codigo`
- `nombre`
- `activo`
- `admiteGanaderia`
- `admiteLecheria`
- `codigoSima`
- `hectareas`
- `hectareasProductivas`
- `fechaUltimaActualizacion`

Para lotes, `erpId` se deriva como `lote:${idLote}`.

La relacion con campos se guarda como `campoErpId = campo:${idCampo}`.

### Agricultura/Actividades

El contrato de `Agricultura/Actividades` trae actividades maestras del ERP, no labores planificadas por lote.

Campos relevantes:

- `idActividad`
- `codigo`
- `descripcion`
- `activo`
- `habilitadoExportacionCrea`
- `idEspecie`
- `idTipoActividad`
- `fechaUltimaActualizacion`

Para actividades, `erpId` se deriva como `actividad:${idActividad}`.

### Agricultura/Especies

El contrato de `Agricultura/Especies` trae especies/cultivos maestros del ERP.

Campos relevantes:

- `idEspecie`
- `codigo`
- `nombre`
- `activo`
- `codigoCot`
- `codigoAfip`
- `fechaUltimaActualizacion`
- `precios`

Para especies, `erpId` se deriva como `especie:${idEspecie}`.

El arreglo `precios` queda fuera del contrato interno del MVP hasta definir si Agro App debe mostrar precios, sincronizarlos o solo usarlos como referencia.

### Agricultura/Campanias

El contrato de `Agricultura/Campanias` trae campañas agrícolas por empresa ERP.

Campos relevantes:

- `idCampania`
- `codigo`
- `nombre`
- `activo`
- `esActual`
- `fechaUltimaActualizacion`
- `fechasCampanias`

Para campañas, `erpId` se deriva como `empresa:<idEmpresa>:campania:<idCampania>`.

El campo `esActual` se conserva porque permite sugerir una campaña por defecto en la carga de registros. El arreglo `fechasCampanias` queda fuera del contrato interno del MVP hasta definir si se usará para validar fechas operativas.

### Agricultura/Cultivos

El contrato de `Agricultura/Cultivos` trae cultivos agrícolas por empresa ERP y es un padrón clave para futuras cargas operativas.

Campos relevantes:

- `idCultivo`
- `codigo`
- `nombre`
- `idCampo`
- `idLote`
- `idActividad`
- `idEspecie`
- `idCampania`
- `hectareas`
- `hectareasSembradas`
- `hectareasCosechadas`
- `idPuerto`
- `distanciaPuerto`
- `idPersonalResponsable`
- `esAgriculturaIntensiva`
- `socioEnFuncionAportes`
- `activo`
- `fechaUltimaActualizacion`
- `socios`
- `rindes`

Para cultivos, `erpId` se deriva como `empresa:<idEmpresa>:cultivo:<idCultivo>`.

Tambien se guardan referencias internas derivadas:

- `campoErpId`
- `loteErpId`
- `actividadErpId`
- `especieErpId`
- `campaniaErpId`

En esta etapa solo se guarda el padrón principal. Los subcontratos `socios` y `rindes` quedan fuera del MVP hasta definir los requerimientos derivados.

### Padrones/Insumos

El contrato de `Padrones/Insumos` trae insumos por empresa ERP y requiere `x-company`.

Campos relevantes:

- `idInsumo`
- `idUnidadMedida`
- `idTipoInsumo`
- `idCategoriaInsumo`
- `codigo`
- `nombre`
- `activo`
- `controlaStock`
- `esInsumoGenerico`
- `controlaPorLote`
- `precioUnitario`
- `precioUnitarioVenta`
- `unidadesBulto`
- `idMonedaPrecioUnitario`
- `iMonedaPrecioVenta`
- `idCuentaContable`
- `idInsumoBanda`
- `idInsumoEstandar`
- `fechaUltimaActualizacion`

Para insumos, `erpId` se deriva como `empresa:<idEmpresa>:insumo:<idInsumo>`.

El precio unitario del ERP se guarda como referencia. Cuando un insumo se use en un protocolo o planificacion, el costo debe copiarse a una version editable para evitar que cambios posteriores del ERP modifiquen supuestos historicos.

### Sistema/Empresas

El contrato de `Sistema/Empresas` trae todas las empresas dadas de alta en el ERP.

Campos relevantes:

- `idEmpresa`
- `codigo`
- `nombre`
- `activo`
- `cuit`
- `razonSocial`
- `email`
- `fechaUltimaActualizacion`

Para empresas, `erpId` se deriva como `empresa:${idEmpresa}`.

Agro App guarda este padrón en `ErpEmpresa`. Además, la tabla `ClienteEmpresaErp` permite que un administrador defina cuáles empresas ERP pertenecen al cliente/tenant de Agro App. Esto evita hardcodear empresas en el código y deja preparado el escenario multi-cliente.

## Sincronizacion por empresa

Los padrones operativos del ERP requieren el header obligatorio `x-company`, cuyo valor es el `idEmpresa` del ERP.

Por eso el flujo queda asi:

1. Consultar `Sistema/Empresas` sin empresa seleccionada para obtener el padrón completo.
2. El administrador marca qué empresas ERP corresponden a AGRO mediante `ClienteEmpresaErp`.
3. Para cada empresa seleccionada, Agro App consulta los padrones operativos enviando `x-company: <idEmpresa>`.
4. Cada registro importado guarda `empresaErpId` para saber desde qué empresa vino.

El identificador interno de los datos por empresa incluye la empresa para evitar colisiones:

- `empresa:1:campo:241`
- `empresa:1:lote:724`
- `empresa:1:especie:33`
- `empresa:1:campania:961`
- `empresa:1:cultivo:576`
- `empresa:1:insumo:674`

Si una sincronizacion se repite para la misma empresa y el mismo identificador ERP, se actualiza el registro existente. Si otra empresa devuelve datos para el mismo identificador numerico, se guarda como otro registro porque pertenece a otra empresa ERP.

## Tablas de snapshot

Se agregan tablas separadas:

- `ErpCampo`
- `ErpZona`
- `ErpLote`
- `ErpActividad`
- `ErpEspecie`
- `ErpEmpresa`
- `ErpCampania`
- `ErpCultivo`
- `ErpInsumo`

Estas tablas guardan una copia importada del ERP. Estan separadas de `Campo`, `Lote` y modelos operativos porque representan datos maestros externos, no datos propios generados por Agro App.

Tambien se agregan tablas de configuracion por cliente:

- `ClienteEmpresaErp`: empresas ERP asociadas al cliente.

## Endpoints actuales

- `GET /erp/snapshot`: devuelve el mock de respuesta ERP.
- `POST /erp/sincronizar`: toma el mock y lo persiste en las tablas `Erp*`.
- `GET /erp/configuracion`: devuelve estado de configuracion sin exponer secretos.

`POST /erp/sincronizar` requiere PostgreSQL disponible. `GET /erp/snapshot` funciona sin base de datos y permite avanzar en front.

## Cliente HTTP real

Cuando `ERP_AUTH_MODE` no es `mock`, `clienteErp.ts` consulta endpoints reales del ERP:

- `Padrones/Zonas`
- `Padrones/Campos`
- `Padrones/Lotes`
- `Agricultura/Actividades`
- `Agricultura/Especies`
- `Agricultura/Campanias`
- `Agricultura/Cultivos`
- `Padrones/Insumos`
- `Sistema/Empresas`

Luego mapea cada respuesta al contrato interno:

- `mapearRespuestaPadronesZonas`
- `mapearRespuestaPadronesCampos`
- `mapearRespuestaPadronesLotes`
- `mapearRespuestaAgriculturaActividades`
- `mapearRespuestaAgriculturaEspecies`
- `mapearRespuestaAgriculturaCampanias`
- `mapearRespuestaAgriculturaCultivos`
- `mapearRespuestaPadronesInsumos`
- `mapearRespuestaSistemaEmpresas`

El mock queda disponible solo para desarrollo local.

## Paginacion

Los endpoints del ERP aceptan el parametro `NoPaginate`.

La decision para el MVP es consultar paginado por defecto:

- `NoPaginate=false`
- `PageNumber=1..N`
- `PageSize` configurable con `ERP_PAGE_SIZE`

Motivo: es mas estable para sincronizaciones reales, evita traer demasiado volumen en una sola respuesta, permite reintentos por pagina y reduce el riesgo de timeouts.

`NoPaginate=true` queda disponible mediante `ERP_NO_PAGINATE=true`, pero se reserva para pruebas puntuales o endpoints muy chicos.

## Configuracion y credenciales

Los secretos no se guardan en el repositorio. En produccion, la configuracion ERP se guarda por cliente en base de datos y los secretos se cifran antes de persistirlos.

`.env` queda como fallback de desarrollo y para configuracion tecnica global.

Variables disponibles:

```env
ERP_BASE_URL=""
ERP_AUTH_MODE="mock"
ERP_API_KEY=""
ERP_API_KEY_HEADER="x-api-key"
ERP_BEARER_TOKEN=""
ERP_USERNAME=""
ERP_PASSWORD=""
ERP_TIMEOUT_MS=15000
ERP_PAGE_SIZE=500
ERP_NO_PAGINATE=false
ERP_PATH_ZONAS="Padrones/Zonas"
ERP_PATH_CAMPOS="Padrones/Campos"
ERP_PATH_LOTES="Padrones/Lotes"
ERP_PATH_ACTIVIDADES="Agricultura/Actividades"
ERP_PATH_ESPECIES="Agricultura/Especies"
ERP_PATH_CAMPANIAS="Agricultura/Campanias"
ERP_PATH_CULTIVOS="Agricultura/Cultivos"
ERP_PATH_INSUMOS="Padrones/Insumos"
ERP_PATH_EMPRESAS="Sistema/Empresas"
```

Modos de autenticacion soportados:

- `mock`: usa datos locales y no requiere credenciales.
- `apiKey`: envia `ERP_API_KEY` en el header definido por `ERP_API_KEY_HEADER`.
- `bearer`: envia `Authorization: Bearer <ERP_BEARER_TOKEN>`.
- `basic`: envia `Authorization: Basic` usando `ERP_USERNAME` y `ERP_PASSWORD`.

El endpoint `GET /erp/configuracion` sirve para verificar que las variables estan cargadas sin devolver valores sensibles.

## Configuracion por cliente

Modelos preparados:

- `Cliente`: representa la empresa/tenant que usa Agro App.
- `IntegracionErp`: guarda la configuracion ERP activa de un cliente.

Campos sensibles cifrados:

- `apiKeyCifrada`
- `bearerTokenCifrado`
- `usernameCifrado`
- `passwordCifrada`

La clave de cifrado sale de:

```env
SECRETS_ENCRYPTION_KEY="..."
```

Endpoints admin preparados:

- `GET /admin/integracion-erp/:clienteId`
- `PUT /admin/integracion-erp/:clienteId`
- `POST /admin/integracion-erp/:clienteId/probar`
- `GET /admin/empresas-erp/:clienteId/empresas`
- `PUT /admin/empresas-erp/:clienteId/empresas`

## Pantalla web Empresas ERP

La web incluye una pantalla administrativa `Empresas ERP`, visible solo para usuarios con permiso `erp:configurar`.

La pantalla permite:

- Ver empresas disponibles del ERP.
- Ver el valor `idEmpresa` que se enviara como `x-company`.
- Marcar que empresas pertenecen a AGRO.
- Guardar la seleccion en backend cuando PostgreSQL este disponible.
- Mantener una seleccion local en modo demo si la base no esta levantada.

La persistencia definitiva se realiza en `ClienteEmpresaErp`.

Estos endpoints devuelven solamente estado publico de configuracion. Nunca devuelven API keys, tokens ni passwords.

El cliente ERP intenta resolver credenciales en este orden:

1. Configuracion activa en DB para el `clienteId`.
2. Fallback `.env`.
3. Modo `mock`.

## Visibilidad por usuario

Los datos del ERP se filtran por asignacion de campos:

- La tabla `UsuarioCampoErp` guarda que campos puede ver/trabajar cada usuario.
- La relacion usa `campoErpId` porque el dato maestro del campo viene del ERP.
- El filtro se aplica en backend antes de responder `GET /erp/snapshot`.
- Los administradores pueden ver todos los campos del cliente.
