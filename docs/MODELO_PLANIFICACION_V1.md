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
- `empresaErpId`
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

## Vinculacion con ERP

La herramienta de vinculacion debe permitir:

- listar padrones base provisorios;
- buscar posibles coincidencias en padrones ERP;
- comparar nombre, codigo, superficie cuando aplique y empresa;
- seleccionar el registro ERP correcto;
- confirmar vinculacion;
- auditar quien vinculo, cuando y que entidades se vincularon.

Reglas de seguridad:

- Solo usuarios autorizados pueden vincular padrones base provisorios con ERP.
- No se debe vincular un padron base a una empresa ERP no asociada al cliente.
- Si un padron base provisorio ya fue usado en planificaciones aprobadas, la vinculacion no debe alterar supuestos historicos.

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
- Para una misma `campaniaErpId`, `campoPlanificacionId`, `lotePlanificacionId` y `actividadPlanificacionId` no puede existir mas de una linea.
- Toda modificacion debe auditarse.

## DestinoVentaReferencia

Tabla propia para sugerir destino de venta.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `zonaErpId` opcional
- `campoPlanificacionId` opcional
- `campoErpId` opcional
- `actividadErpId`
- `especieErpId` opcional
- `cultivoErpId` opcional
- `destinoVenta`
- `descripcion`
- `prioridad`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

## PrecioReferencia

Tabla propia para sugerir precios de venta y seguir valores durante la campania.

Campos sugeridos:

- `id`
- `clienteId`
- `campaniaErpId`
- `empresaErpId` opcional
- `actividadErpId`
- `especieErpId`
- `cultivoErpId` opcional
- `destinoVenta`
- `tipoPrecio`
- `valor`
- `moneda`
- `unidad`
- `fechaVigenciaDesde`
- `fechaVigenciaHasta` opcional
- `fuente`
- `observaciones`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

## GastosComercialesReferencia

Tabla propia para sugerir gastos comerciales por zona/campo/actividad/destino.

Campos sugeridos:

- `id`
- `clienteId`
- `empresaErpId`
- `zonaErpId` opcional
- `campoPlanificacionId` opcional
- `campoErpId` opcional
- `actividadErpId`
- `destinoVenta` opcional
- `descripcion`
- `items`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Cada item debe guardar `concepto`, `tipoCalculo`, `valor`, `moneda` y unidad opcional.

Tipos de calculo:

- `por_ha`
- `por_tn`
- `porcentaje_ingreso`
- `importe_fijo`

La linea de planificacion guarda `gastosComercialesReferenciaId` y copia el total calculado en `gastosComercialesEstimados`.

## ProtocoloProductivo

Plantilla reutilizable para costos productivos.

Campos sugeridos:

- `id`
- `clienteId`
- `nombre`
- `descripcion`
- `protocoloOrigenId` opcional
- `empresaErpId` opcional
- `campaniaErpId` opcional
- `actividadErpId`
- `especieErpId` opcional
- `zonaErpId` opcional
- `zonaPlanificacionId` opcional
- `campoPlanificacionId` opcional
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Reglas:

- Todo protocolo debe estar asociado a una actividad.
- Un protocolo puede estar asociado a una zona.
- Un protocolo puede estar asociado a un campo.
- Si `campoPlanificacionId` es null, el protocolo aplica a todos los campos compatibles segun zona/actividad.
- Si `zonaErpId`/`zonaPlanificacionId` tambien es null, el protocolo aplica de forma general para esa actividad.
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
- `orden`
- `nombre`
- `descripcion`
- `observaciones`

## ProtocoloLabor

Campos sugeridos:

- `id`
- `etapaId`
- `nombre`
- `descripcion`
- `unidad`
- `cantidadPorHa`
- `costoUnitario`
- `costoPorHa`
- `momentoEstimado`

## ProtocoloInsumo

Campos sugeridos:

- `id`
- `etapaId`
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
- El precio del insumo se copia al protocolo como referencia editable.
- Cambios posteriores en `ErpInsumo` no modifican protocolos ni planificaciones aprobadas sin accion explicita.

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
- vincular zona/campo/lote/especie/actividad/insumo provisorio con ERP;
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
- Definir si la vinculacion ERP puede ser sugerida automaticamente por similitud.
- Definir pantalla de comparacion para vincular entidades provisorias.
