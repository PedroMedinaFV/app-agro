# Modelo Planificacion V1

## Objetivo

Definir el modelo funcional de datos para implementar la primera version de planificacion agricola, protocolos productivos, precios de referencia, destinos sugeridos y auditoria.

Este documento congela acuerdos antes de escribir codigo.

## Principios

- La planificacion es propia de Agro App.
- El ERP aporta padrones de referencia, pero no bloquea la planificacion.
- Todo dato propio debe pertenecer a un `clienteId`.
- Todo cambio de usuario debe auditarse.
- Los supuestos economicos usados en una planificacion deben copiarse y conservarse.
- Los datos ERP vinculados se referencian por `erpId`, pero no se modifican desde Agro App.

## Padrones base provisorios

Puede ocurrir que un dato base todavia no exista en el ERP, pero sea necesario planificarlo.

Para no frenar el proceso, Agro App debe permitir crear padrones base provisorios.

Aplica a:

- zonas;
- campos;
- lotes;
- especies;
- actividades;
- insumos.

No aplica a datos operativos devueltos por endpoints como `Agricultura/Cultivos`. Esos registros representan informacion propia del ERP sobre cultivos/campanias/lotes y no deben crearse como padron base provisorio dentro de Agro App para desbloquear planificacion.

Regla general:

- Cada padron base operativo de Agro App tiene un registro propio.
- Ese registro puede estar `provisorio`, `vinculado_erp` o `archivado`.
- Si esta vinculado, guarda el `erpId` correspondiente.
- Si no esta vinculado, puede usarse igual en planificacion.
- Cuando el ERP devuelva el registro real, un usuario autorizado puede vincularlo.
- Toda creacion, edicion y vinculacion debe auditarse.

### ZonaPlanificacion

Representa una zona propia de Agro App usada para agrupar campos y sugerir destinos/gastos.

Campos sugeridos:

- `id`
- `clienteId`
- `campaniaErpId`
- `empresaErpId`
- `zonaPlanificacionId` opcional
- `zonaErpId` opcional
- `nombre`
- `codigoInterno`
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Si `zonaErpId` existe, la zona esta vinculada al ERP.
- Si `zonaErpId` no existe, la zona es provisoria.
- Puede usarse para campos, destinos sugeridos y gastos comerciales.

### CampoPlanificacion

Representa un campo propio de Agro App usado para planificar.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `zonaPlanificacionId` opcional
- `campoErpId` opcional
- `nombre`
- `codigoInterno`
- `zonaErpId` opcional
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Estados de vinculacion:

- `provisorio`
- `vinculado_erp`
- `archivado`

Reglas:

- Si `campoErpId` existe, el campo esta vinculado al ERP.
- Si `campoErpId` no existe, el campo es provisorio.
- Un campo provisorio puede usarse en planificaciones.
- Cuando el ERP devuelva el campo real, el usuario autorizado puede vincularlo.
- La vinculacion debe auditarse.

### LotePlanificacion

Representa un lote propio de Agro App usado para planificar.

Campos sugeridos:

- `id`
- `clienteId`
- `campoPlanificacionId`
- `loteErpId` opcional
- `nombre`
- `codigoInterno`
- `superficieTotal`
- `superficieProductiva`
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Si `loteErpId` existe, el lote esta vinculado al ERP.
- Si `loteErpId` no existe, el lote es provisorio.
- La superficie total y productiva son obligatorias para poder calcular planificacion.
- Cuando el ERP devuelva el lote real, el usuario autorizado puede vincularlo.
- La vinculacion debe auditarse.

### EspeciePlanificacion

Representa una especie propia de Agro App usada para agrupar actividades, precios y protocolos.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `especieErpId` opcional
- `nombre`
- `codigoInterno`
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Si `especieErpId` existe, la especie esta vinculada al ERP.
- Si `especieErpId` no existe, la especie es provisoria.
- Puede usarse para planificacion, precios y protocolos.

### ActividadPlanificacion

Representa una actividad propia de Agro App usada para planificar cultivos o actividades productivas.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `actividadErpId` opcional
- `especiePlanificacionId` opcional
- `nombre`
- `codigoInterno`
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Si `actividadErpId` existe, la actividad esta vinculada al ERP.
- Si `actividadErpId` no existe, la actividad es provisoria.
- Puede usarse en lineas de planificacion, destinos, precios, gastos y protocolos.

### InsumoPlanificacion

Representa un insumo propio de Agro App usado para armar protocolos y costos productivos.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `insumoErpId` opcional
- `nombre`
- `codigoInterno`
- `tipo`
- `unidad`
- `precioUnitarioEstimado` opcional
- `moneda` opcional
- `estadoVinculacion`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Si `insumoErpId` existe, el insumo esta vinculado al ERP.
- Si `insumoErpId` no existe, el insumo es provisorio.
- Puede usarse en protocolos aunque todavia no exista en ERP.
- Al usarlo en un protocolo o planificacion, se copia precio/costo estimado para conservar el supuesto.
- Cuando el ERP devuelva el insumo real, un usuario autorizado puede vincularlo.
- La vinculacion debe auditarse.
- En web se administra desde `Padrones > Insumos` con permisos de configuracion de planificacion.
- La unidad se selecciona desde `ErpUnidadMedida` cuando el snapshot ERP lo tenga disponible y se copia como codigo operativo.

## Vinculacion con ERP

La herramienta de vinculacion debe permitir:

- listar padrones base provisorios;
- buscar posibles coincidencias en padrones ERP;
- comparar nombre, codigo, superficie cuando aplique y empresa;
- seleccionar el registro ERP correcto;
- confirmar vinculacion;
- auditar quien vinculo, cuando y que entidades se vincularon.

Tambien debe existir un vinculador asistido por sistema.

Flujo propuesto:

1. Se ejecuta una sincronizacion de padrones ERP.
2. El backend compara los registros ERP nuevos o actualizados contra padrones provisorios de Agro App.
3. Si encuentra una posible coincidencia, crea una `VinculacionErpSugerida` con puntaje, criterios usados y snapshot del registro ERP.
4. El sistema genera una notificacion para administradores o usuarios con permiso de vinculacion.
5. El usuario autorizado revisa la propuesta en una pantalla de comparacion.
6. El usuario puede aceptar, rechazar o dejar pendiente la sugerencia.
7. Si acepta, se actualiza el `erpId` del padron provisorio y el estado pasa a `vinculado_erp`.
8. La decision queda auditada con valores antes/despues.

La sugerencia del sistema no debe vincular automaticamente en el MVP. La confirmacion humana reduce riesgos de asociar mal actividades, lotes o insumos con nombres parecidos.

Entidades soportadas por el vinculador:

- `zona`
- `campo`
- `lote`
- `especie`
- `actividad`
- `insumo`

Criterios de coincidencia sugeridos:

- misma empresa ERP;
- codigo igual o muy similar;
- nombre normalizado igual o muy similar;
- relacion jerarquica compatible, por ejemplo lote dentro del campo correcto;
- superficie similar para lotes;
- especie compatible para actividades;
- tipo/unidad compatible para insumos.

Estados de una sugerencia:

- `pendiente`
- `aceptada`
- `rechazada`
- `expirada`

La sugerencia debe tener una restriccion unica por cliente, tipo de entidad, entidad provisoria y entidad ERP para evitar duplicados cuando se ejecutan varias sincronizaciones.

### Notificaciones de vinculacion

Cuando el sistema detecta coincidencias probables debe crear una notificacion interna.

Reglas:

- la notificacion debe pertenecer al `clienteId`;
- puede estar dirigida a un usuario especifico o a una bandeja general de administradores;
- debe indicar tipo de padron, nombre provisorio, posible match ERP y nivel de confianza;
- debe permitir navegar a la pantalla de comparacion;
- debe poder marcarse como leida, resuelta o descartada;
- aceptar o rechazar una sugerencia debe cerrar la notificacion asociada.

Tipos iniciales:

- `vinculacion_erp_sugerida`
- `vinculacion_erp_resuelta`

Reglas de seguridad:

- Solo usuarios autorizados pueden vincular padrones base provisorios con ERP.
- No se debe vincular un padron base a una empresa ERP no asociada al cliente.
- Si un padron base provisorio ya fue usado en planificaciones aprobadas, la vinculacion no debe alterar supuestos historicos.
- La aceptacion o rechazo de una sugerencia debe validar permisos en backend.
- La pantalla debe mostrar diferencias relevantes antes de permitir aceptar.
- Si el puntaje de coincidencia es bajo, la sugerencia debe quedar como baja prioridad o requerir doble confirmacion futura.

## PlanificacionAgricola

Cabecera de planificacion por campania.

Campos sugeridos:

- `id`
- `clienteId`
- `campaniaErpId`
- `nombre`
- `descripcion`
- `estado`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Estados:

- `borrador`
- `en_revision`
- `aprobada`
- `cerrada`

Reglas de cierre:

- Una planificacion `cerrada` queda bloqueada para modificaciones de cabecera, lineas, precios copiados, destinos copiados, protocolos copiados, rindes, hectareas y gastos.
- El cierre debe ejecutarse desde backend y validar permiso `planificacion:cerrar`.
- La UI puede deshabilitar controles, pero el bloqueo real debe estar en backend.
- Una planificacion cerrada solo puede consultarse, exportarse o usarse como base para crear una copia nueva.
- Si mas adelante se permite reabrir una planificacion, debe requerir un permiso especifico, motivo obligatorio y auditoria completa.
- El cierre debe registrar `cerradaPor`, `cerradaAt` y, opcionalmente, `motivoCierre`.

## PlanificacionAgricolaLinea

Fila de planificacion por lote/actividad/cultivo.

Campos sugeridos:

- `id`
- `planificacionId`
- `empresaErpId`
- `campoPlanificacionId`
- `campoErpId` opcional
- `lotePlanificacionId`
- `loteErpId` opcional
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `cultivoErpId` opcional
- `destinoReferenciaId` opcional
- `destinoVenta`
- `destinoVentaManual`
- `precioReferenciaId` opcional
- `precioVentaEstimado`
- `precioVentaManual`
- `hectareasPlanificadas`
- `rindeEstimado`
- `gastosComercialesReferenciaId` opcional
- `gastosComercialesEstimados`
- `protocoloId` opcional
- `ingresoBrutoEstimado`
- `ingresoNetoEstimado`
- `costoProduccionEstimado`
- `margenBrutoEstimado`
- `margenBrutoActualizado` opcional
- `estado`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Puede referenciar padrones base vinculados al ERP o padrones base provisorios.
- Puede referenciar actividad vinculada al ERP o actividad provisoria.
- Si usa padrones base provisorios, debe conservar esas referencias aunque luego se vinculen al ERP.
- Si se aprueba, no debe cambiar automaticamente ante cambios de precio, destino, protocolo o vinculacion ERP.
- Si la planificacion esta cerrada, no se puede modificar ninguna linea.
- Para una misma planificacion, `campoPlanificacionId`, `lotePlanificacionId` y `actividadPlanificacionId` no puede existir mas de una linea.
- Toda modificacion debe auditarse.

## DestinoVentaReferencia

Catalogo propio de destinos de venta.

El destino es unico por cliente y nombre normalizado. No depende de actividad, zona, campo, cultivo ni empresa. Esas dimensiones pueden usarse para reglas de sugerencia, pero no para crear duplicados del mismo destino.

Campos sugeridos:

- `id`
- `clienteId`
- `destinoVenta`
- `destinoVentaNormalizado`
- `descripcion`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- `clienteId` + `destinoVentaNormalizado` debe ser unico.
- `destinoVentaNormalizado` se calcula en backend con trim, espacios simples, sin tildes y uppercase.
- Si un precio crea un destino nuevo, se crea el destino global sin asociarlo obligatoriamente a la actividad del precio.
- Si se necesita sugerir destinos por zona/campo/actividad, esa configuracion debe vivir en una tabla de reglas que referencie el destino global y no duplicarlo.
- El padron maestro no expone prioridad al usuario. Si una regla de sugerencia necesitara orden, esa prioridad pertenecera a la regla, no al destino.

## PrecioReferencia

Entidad transversal de Agro App para sugerir precios de venta y seguir valores comerciales.

Planificacion la consume para proponer precios y calcular margen bruto, pero la entidad no pertenece exclusivamente al modulo de planificacion.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId` opcional
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `especiePlanificacionId` opcional
- `especieErpId` opcional
- `cultivoErpId` opcional
- `destinoVenta`
- `valor`
- `moneda`
- `unidad`
- `fuente`
- `observaciones`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- No depende de una campania agricola.
- `createdAt` y `updatedAt` se generan automaticamente.
- `destinoVenta` debe seleccionarse desde catalogo; si no existe, se debe crear desde la misma experiencia.
- En MVP no se expone `tipoPrecio` al usuario. Si mas adelante se necesita distinguir mercado, forward, fijado o estimado, se reabrira la decision con un nombre funcional claro.
- Toda alta o modificacion debe auditarse con valores previos y posteriores.
- Editar un precio de referencia solo cambia propuestas futuras y calculos actualizados; no modifica supuestos copiados en planificaciones aprobadas o cerradas.

Endpoint MVP:

- `PUT /precios-referencia/:id`

## GastosComercialesReferencia

Tabla propia para sugerir gastos comerciales por zona/campo/actividad/destino.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `zonaErpId` opcional
- `campoPlanificacionId` opcional
- `campoErpId` opcional
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `destinoVenta` opcional
- `descripcion`
- `items`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Cada item debe guardar `conceptoGastoComercialId`, `conceptoNombre`, `valorPorTonelada`, `moneda` y `observaciones` opcional.

El concepto se elige desde un maestro `ConceptoGastoComercial`; no se carga como texto libre. El nombre queda copiado en el item como snapshot legible para reportes y auditoria, pero la referencia principal es el ID del maestro.

Decision MVP:

- Los gastos comerciales pertenecen a una campania agricola.
- Pueden configurarse para todas las zonas, para una zona especifica o para un campo especifico.
- Campo tiene prioridad sobre zona al sugerir gastos en una linea de planificacion.
- Todos los gastos comerciales se cargan como valor por tonelada.
- Los items se seleccionan desde un listado maestro para evitar variantes escritas por el usuario.
- El sistema calcula el total multiplicando la produccion estimada en toneladas por la suma de los valores por tonelada.
- No se expone `tipoCalculo` ni `unidad` en el MVP para reducir carga cognitiva.
- Si mas adelante aparece la necesidad real, se podran sumar calculos por hectarea, porcentaje de ingreso o importe fijo.

La linea de planificacion guarda `gastosComercialesReferenciaId` y copia el total calculado en `gastosComercialesEstimados`.

Reglas:

- Toda alta o modificacion debe auditarse con valores previos y posteriores.
- Los items no pueden tener concepto maestro vacio ni valor por tonelada negativo.
- La pantalla web principal es una grilla con alta/edicion en modal.
- Editar la referencia solo cambia propuestas futuras o recalculos explicitos; no modifica supuestos copiados en planificaciones aprobadas o cerradas.

Endpoint MVP:

- `PUT /gastos-comerciales-referencia/:id`

## ProtocoloProductivo

Plantilla reutilizable para costos productivos.

Campos sugeridos:

- `id`
- `clienteId`
- `nombre`
- `descripcion`
- `protocoloOrigenId` opcional
- `empresaErpId` opcional
- `campaniaErpId`
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `tipoFecha`
- `fechaSiembra` opcional
- `zonaPlanificacionId` opcional
- `campoPlanificacionId` opcional
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Todo protocolo debe estar asociado a una actividad de planificacion.
- Todo protocolo debe estar asociado a una campania.
- No se guarda `especieErpId` como referencia principal en el protocolo porque la especie se deriva de la actividad de planificacion.
- `tipoFecha` se define a nivel protocolo y puede ser `absoluta` o `relativa_siembra`.
- `fechaSiembra` es la fecha base para calcular etapas relativas a siembra.
- Un protocolo puede estar asociado a una zona.
- Un protocolo puede estar asociado a un campo.
- Si `campoPlanificacionId` es null, el protocolo aplica a todos los campos compatibles segun zona/actividad.
- Si `zonaPlanificacionId` tambien es null, el protocolo aplica de forma general para esa actividad dentro de la campania.
- Al seleccionar una actividad en la planificacion, el select de protocolos debe mostrar solo protocolos compatibles con actividad, zona y/o campo.
- Los protocolos compatibles deben ordenarse por `updatedAt` descendente; si no existe, usar `createdAt` descendente.
- El primer protocolo compatible se puede proponer automaticamente, pero el usuario puede elegir otro compatible.
- La accion de copiar un protocolo crea un registro nuevo e independiente con `protocoloOrigenId` apuntando al protocolo base.
- La copia debe duplicar etapas, labores e insumos con nuevos ids internos.
- La copia queda editable y sus cambios no impactan al protocolo origen.
- El protocolo origen no debe impactar copias existentes ni planificaciones que ya lo hayan usado.
- Copiar un protocolo requiere permiso `planificacion:configurar` y auditoria completa.

## ProtocoloEtapa

Campos sugeridos:

- `id`
- `protocoloId`
- `estadioReferenciaId`
- `estadioCodigo` opcional
- `orden`
- `nombre`
- `descripcion`
- `fechaObjetivo`
- `diasDesdeSiembra`
- `observaciones`

Reglas de fecha:

- El tipo de fecha se define en `ProtocoloProductivo.tipoFecha`, no en cada etapa.
- Si el protocolo tiene `tipoFecha = absoluta`, cada etapa debe tener `fechaObjetivo`.
- Si el protocolo tiene `tipoFecha = relativa_siembra`, cada etapa debe tener `diasDesdeSiembra`.
- `diasDesdeSiembra` debe ser entero y puede ser negativo, cero o positivo.
- La etapa `Siembra` o `Siembra directa` usa `diasDesdeSiembra = 0` cuando se trabaja con fechas relativas.
- Si el protocolo relativo tiene etapa `Siembra` o `Siembra directa`, debe tener `fechaSiembra` antes de guardarse como listo para uso operativo.

## EstadioFenologicoReferencia

Padron inicial propio para seleccionar estadios en protocolos.

Campos sugeridos:

- `id`
- `idEstadio`
- `actividadErpId` opcional
- `codigo`
- `nombre`
- `ordenCronologico`
- `empresaErpId` opcional
- `activo`
- `origen`

Reglas:

- Inicialmente se carga como semilla desde `AlborExcel.xlsx`.
- Si mas adelante el ERP expone un endpoint de estadios, se podra sincronizar como padron ERP.
- Cada etapa debe referenciar un estadio mediante `estadioReferenciaId`.
- La etapa copia `estadioCodigo`, `nombre` y `orden` para conservar contexto historico.
- En un mismo protocolo no debe repetirse `estadioReferenciaId`.

## ProtocoloLabor

Campos sugeridos:

- `id`
- `etapaId`
- `laborReferenciaId` opcional
- `indiceAplicacion`
- `nombre`
- `descripcion`
- `unidad`
- `cantidadPorHa`
- `costoUnitario`
- `costoPorHa`
- `momentoEstimado`

Reglas:

- La labor debe seleccionarse desde un padron cuando sea posible.
- Al seleccionar una labor, el protocolo copia `laborReferenciaId`, `nombre`, `descripcion`, `unidad` y `costoUnitario` sugerido.
- La copia queda editable dentro del protocolo para reflejar condiciones puntuales sin modificar el padron maestro.
- Cambios posteriores en el padron de labores no deben modificar protocolos existentes sin accion explicita.
- `indiceAplicacion` debe ser un numero decimal entre `0` y `1`.
- Por defecto, `indiceAplicacion = 1`.
- El costo por hectarea se calcula como `cantidadPorHa * costoUnitario * indiceAplicacion`.

## ProtocoloInsumo

Campos sugeridos:

- `id`
- `etapaId`
- `indiceAplicacion`
- `insumoPlanificacionId`
- `insumoErpId`
- `nombre`
- `tipo`
- `unidad`
- `dosisPorHa`
- `precioUnitarioEstimado`
- `costoPorHa`
- `momentoEstimado`

Reglas:

- `insumoPlanificacionId` es la referencia operativa principal.
- `insumoErpId` queda opcional y existe solo si el insumo esta vinculado al ERP.
- Al seleccionar un insumo, el protocolo copia `insumoPlanificacionId`, `insumoErpId`, `nombre`, `tipo`, `unidad` y `precioUnitarioEstimado`.
- La copia de dosis y precio unitario queda editable dentro del protocolo para reflejar condiciones puntuales sin modificar el padron maestro.
- Cambios posteriores en `ErpInsumo` no modifican protocolos ni planificaciones aprobadas sin accion explicita.
- `indiceAplicacion` debe ser un numero decimal entre `0` y `1`.
- Por defecto, `indiceAplicacion = 1`.
- El costo por hectarea se calcula como `dosisPorHa * precioUnitarioEstimado * indiceAplicacion`.

Endpoint MVP de administracion:

- `GET /insumos-planificacion`
- `PUT /insumos-planificacion/:id`

Toda alta o modificacion de `InsumoPlanificacion` debe auditarse con usuario, origen, motivo, valores previos y valores nuevos.

## LaborReferencia

Padron de labores para seleccionar trabajos en protocolos.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId` opcional
- `servicioErpId` opcional
- `idServicio` opcional
- `idTipoServicio` opcional
- `codigo`
- `nombre`
- `descripcionAbreviada` opcional
- `idUnidadMedida` opcional
- `idMoneda` opcional
- `unidadSugerida`
- `costoUnitarioSugerido`
- `imputaDosis` opcional
- `estadoVinculacion`
- `activo`
- `origen`: `semilla`, `provisorio` o `erp`
- `fechaUltimaActualizacionErp` opcional

Reglas:

- Inicialmente puede cargarse como semilla propia de Agro App.
- El ERP expone labores mediante `Padrones/Servicios`.
- Una labor puede crearse en Agro App como `origen = provisorio` y `estadoVinculacion = provisorio` si aun no existe en el ERP.
- Cuando la sincronizacion ERP encuentra un servicio similar, debe crear una sugerencia de vinculacion y notificar al usuario autorizado.
- La vinculacion confirmada completa `servicioErpId`, `empresaErpId` y metadatos ERP, y cambia `estadoVinculacion` a `vinculado_erp`.
- No se debe vincular automaticamente si hay ambiguedad.
- No se deben modificar protocolos o planificaciones aprobadas/cerradas por vincular una labor al ERP.
- El protocolo copia nombre, unidad y costo sugerido al momento de agregar la labor.
- `unidadSugerida` se selecciona desde `ErpUnidadMedida` cuando el snapshot ERP lo tenga disponible y se guarda como codigo copiado.

## ErpUnidadMedida

Padron ERP consultado desde `Padrones/UnidadesMedida`.

Campos sugeridos:

- `empresaErpId`
- `erpId`
- `idUnidadMedida`
- `codigo`
- `codigoSifen` opcional
- `descripcion`
- `activo`
- `actualizadoEn`

Reglas:

- Requiere header `x-company`.
- Respeta el parametro `NoPaginate`.
- Alimenta selects de unidades para labores e insumos.
- No reemplaza automaticamente unidades ya copiadas en protocolos o planificaciones cerradas.

Proceso simple de vinculacion:

1. El usuario crea la labor en Agro App porque todavia no esta en el ERP.
2. La labor queda disponible inmediatamente para protocolos como provisoria.
3. La sincronizacion consulta `Padrones/Servicios` por empresa AGRO.
4. El backend compara por `codigo` normalizado, `nombre/descripcion` normalizados, unidad y tipo de servicio.
5. Si hay una coincidencia confiable, crea una sugerencia de vinculacion.
6. El usuario autorizado confirma o rechaza desde una pantalla de vinculaciones/notificaciones.
7. Al confirmar, Agro App vincula la labor con el servicio ERP, registra auditoria y conserva los datos historicos copiados en protocolos.
8. Al rechazar, la sugerencia queda cerrada y la labor sigue provisoria.

## Copia de protocolo a planificacion

Al asignar un protocolo a una linea de planificacion:

- se referencia el protocolo original;
- se copian etapas, labores e insumos a estructuras propias de la planificacion;
- las copias quedan editables por lote;
- los cambios no modifican el protocolo base.

## Auditoria

Todas estas entidades deben auditar altas, modificaciones, bajas logicas, cambios de estado y vinculaciones.

Eventos clave:

- crear zona/campo/lote/especie/actividad/insumo provisorio;
- crear sugerencia de vinculacion ERP;
- vincular zona/campo/lote/especie/actividad/insumo provisorio con ERP;
- rechazar sugerencia de vinculacion ERP;
- expirar sugerencia de vinculacion ERP;
- crear, leer y resolver notificacion de vinculacion;
- crear planificacion;
- modificar linea;
- cambiar destino sugerido;
- modificar destino manual;
- cambiar precio referencia;
- modificar precio manual;
- asignar protocolo;
- modificar protocolo;
- copiar protocolo;
- aprobar planificacion;
- cerrar planificacion.
- intento rechazado de modificar una planificacion cerrada cuando sea relevante para seguridad.

## Pendientes

- Definir si los padrones base provisorios pueden crearse desde web solamente o tambien mobile.
- Definir permisos especificos para vincular padrones base provisorios con ERP.
- Definir pantalla de comparacion para vincular entidades provisorias.
- Definir umbrales de puntaje para sugerencias altas, medias y bajas.
