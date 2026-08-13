# Planificacion Agricola

## Objetivo

La planificacion agricola es el primer paso antes de iniciar una nueva campania. Permite definir que cultivo o actividad se planifica realizar por campo y lote, estimando ingresos, costos productivos y margen bruto esperado.

La planificacion no reemplaza al ERP. Usa padrones del ERP como base y agrega una capa propia de decision, simulacion y control economico-productivo dentro de Agro App.

## Alcance inicial

La primera version debe permitir:

- planificar por campania;
- seleccionar empresa, campo y lote;
- indicar actividad/cultivo planificado;
- proponer destino de venta desde una configuracion por zona/campo/actividad;
- permitir modificar manualmente el destino de venta;
- estimar rinde;
- proponer precio de venta desde una tabla de precios de referencia;
- permitir modificar manualmente el precio de venta planificado;
- cargar gastos comerciales de venta;
- asociar un protocolo productivo;
- calcular ingresos, costos y margen bruto estimado.

## Datos base desde ERP

La planificacion se apoya en padrones ya integrados o previstos:

- empresas ERP;
- campanias agricolas;
- zonas;
- campos;
- lotes;
- actividades;
- especies;
- insumos;
- cultivos.

Tambien se integra `Padrones/Insumos` del ERP para usar insumos como referencia al armar protocolos.

## Padrones base no registrados en ERP

La planificacion no debe bloquearse si un padron base aun no existe en el ERP.

Agro App debe permitir crear registros provisorios para:

- zonas;
- campos;
- lotes;
- especies;
- actividades;
- insumos.

Cuando el registro aparezca mas adelante en los padrones del ERP, un usuario autorizado debe poder vincular el registro provisorio con el registro ERP correspondiente.

La vinculacion no debe alterar planificaciones historicas sin accion explicita y siempre debe quedar auditada.

Esta regla no aplica para datos operativos como `Agricultura/Cultivos`. Esos datos se importan desde ERP y no se crean como padron base provisorio en Agro App.

El modelo detallado se define en `docs/MODELO_PLANIFICACION_V1.md`.

## Planilla de planificacion

Cada fila de la planilla representa una decision productiva sobre un lote para una campania.

La experiencia principal de carga debe ser tipo planilla/Excel en web:

- permitir agregar varias lineas rapidamente;
- seleccionar la campania a la que pertenece la planificacion desde la cabecera;
- editar campo, lote, actividad, destino, hectareas, rinde, precio, gastos comerciales y protocolo desde la grilla;
- usar select dependientes: primero campo y luego lotes filtrados por ese campo;
- al agregar una nueva linea, proponer por defecto el campo de la linea anterior;
- seleccionar destino de venta desde una tabla de destinos disponibles;
- recalcular ingresos, costos y margen bruto en vivo;
- guardar la planificacion como borrador;
- bloquear la edicion cuando la planificacion este cerrada.

Mobile debe comenzar como vista de consulta/resumen para no forzar una carga pesada en pantalla chica. La carga mobile puede quedar para casos puntuales o flujos simplificados posteriores.

Campos principales:

- `campaniaErpId`
- `empresaErpId`
- `zonaPlanificacionId`
- `campoPlanificacionId`
- `campoErpId`
- `lotePlanificacionId`
- `loteErpId`
- `actividadPlanificacionId`
- `actividadErpId`
- `cultivoErpId`
- `destinoReferenciaId`
- `destinoVenta`
- `destinoVentaManual`
- `hectareasPlanificadas`
- `rindeEstimado`
- `precioReferenciaId`
- `precioVentaEstimado`
- `precioVentaManual`
- `gastosComercialesEstimados`
- `protocoloId`
- `ingresoBrutoEstimado`
- `ingresoNetoEstimado`
- `costoProduccionEstimado`
- `margenBrutoEstimado`
- `estado`

`zonaPlanificacionId`, `campoPlanificacionId`, `lotePlanificacionId` y `actividadPlanificacionId` son las referencias operativas de Agro App. Pueden apuntar a registros ya vinculados al ERP o a registros provisorios creados para no bloquear la planificacion.

Regla de unicidad:

- Dentro de una misma campania, campo y lote no puede existir mas de una linea con la misma actividad de planificacion.
- Esta validacion debe ejecutarse en frontend para mejorar la experiencia y en backend para garantizar integridad.
- Si el usuario necesita diferenciar planteos dentro del mismo lote/actividad, se debera resolver con otra dimension futura, por ejemplo ambiente, sublote o version de planificacion.

Estados sugeridos:

- `borrador`
- `en_revision`
- `aprobada`
- `cerrada`

Una planificacion cerrada queda bloqueada para nuevas modificaciones. El cierre representa el congelamiento definitivo de los supuestos productivos y economicos usados para esa campania.

Si se necesita trabajar sobre una planificacion cerrada, la regla sugerida es crear una copia nueva o una version posterior. Reabrir una planificacion cerrada queda fuera del MVP y, si se habilita mas adelante, debe requerir permiso especifico, motivo obligatorio y auditoria completa.

## Calculo de ingresos

La base de ingresos se calcula con supuestos comerciales.

```txt
produccionEstimada = hectareasPlanificadas * rindeEstimado
ingresoBruto = produccionEstimada * precioVentaEstimado
ingresoNeto = ingresoBruto - gastosComercialesEstimados
```

Los gastos comerciales pueden incluir:

- flete;
- acondicionamiento;
- comisiones;
- secada;
- paritarias u otros conceptos futuros;
- otros gastos de venta.

La apertura por concepto debe modelarse como tabla de gastos comerciales sugeridos. Para la primera grilla se copia el total a la linea de planificacion, pero la referencia y sus items quedan preparados para mostrar detalle y auditar supuestos.

## Gastos comerciales sugeridos

La planificacion debe contar con una tabla de gastos comerciales configurables por contexto productivo.

Campos sugeridos:

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

Cada item debe incluir:

- `concepto`
- `tipoCalculo`
- `valor`
- `moneda`
- `unidad` opcional

Tipos de calculo sugeridos:

- `por_ha`
- `por_tn`
- `porcentaje_ingreso`
- `importe_fijo`

Items iniciales a validar:

- flete;
- acondicionamiento;
- comision comercial;
- secada;
- zarandeo o limpieza;
- paritaria;
- gastos de puerto/acopio;
- otros gastos de venta.

Regla de uso:

1. El sistema busca gastos comerciales por campo + actividad + destino.
2. Si no existe, busca por zona + actividad + destino.
3. Si no existe, busca por actividad + destino.
4. Si no existe, deja el total en cero para carga manual.

Al crear o editar una linea, el sistema copia el total calculado a `gastosComercialesEstimados`. Si luego cambia la tabla de gastos comerciales, no debe modificar planificaciones aprobadas o cerradas sin accion explicita.

## Destinos de venta sugeridos

La planificacion debe contar con una tabla de destinos de venta sugeridos por contexto productivo.

Esta tabla la configura un usuario autorizado y permite que, al crear una linea de planificacion, el sistema proponga automaticamente el destino de venta mas probable.

El objetivo principal es mejorar la experiencia de usuario: evitar que quien planifica tenga que cargar el destino del cereal en cada cultivo/lote de forma repetitiva. Esto reduce fatiga operativa, acelera la carga de la planilla y disminuye errores por seleccion manual.

Campos sugeridos:

- `clienteId`
- `empresaErpId`
- `zonaErpId` opcional
- `campoErpId` opcional
- `actividadErpId`
- `especieErpId` opcional
- `cultivoErpId` opcional
- `destinoVenta`
- `descripcion`
- `prioridad`
- `activo`

Regla de busqueda sugerida:

1. Buscar coincidencia por campo + actividad/cultivo.
2. Si no existe, buscar por zona + actividad/cultivo.
3. Si no existe, buscar por actividad/cultivo general.
4. Si no existe, dejar destino vacio para carga manual.

Al crear una linea de planificacion:

- el sistema guarda `destinoReferenciaId` si encontro una configuracion;
- copia `destinoVenta` a la linea;
- permite al usuario modificar el destino;
- marca `destinoVentaManual` cuando el usuario se aparta de la sugerencia.

La planificacion aprobada debe conservar el destino utilizado originalmente. Si luego cambia la tabla de destinos sugeridos, no debe modificarse la planificacion historica sin accion explicita.

## Precios de referencia

La planificacion debe contar con una tabla de precios de referencia por cereal/cultivo, destino de venta y tipo de precio.

Esta tabla permite:

- proponer automaticamente un precio de venta al crear un cultivo planificado;
- conservar el precio usado originalmente en la planificacion;
- actualizar valores durante la campania;
- recalcular un margen bruto actualizado sin perder el margen planificado original.

Campos sugeridos:

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
- `fechaVigenciaHasta`
- `fuente`
- `observaciones`
- `activo`

Tipos de precio sugeridos:

- `planificado`
- `mercado`
- `forward`
- `fijado`
- `estimado`
- `manual`

Fuentes sugeridas:

- `manual`
- `erp`
- `mercado`
- `importacion`

## Uso del precio en planificacion

Al crear una linea de planificacion:

1. El usuario selecciona campania, campo, lote y actividad/cultivo.
2. El sistema propone un destino de venta segun zona/campo/actividad.
3. El sistema busca un precio de referencia activo para esa actividad/especie/cultivo y destino de venta.
4. El precio encontrado se propone como `precioVentaEstimado`.
5. El usuario puede modificar destino y precio manualmente si tiene un motivo operativo o comercial.
6. La linea guarda:
   - referencia al destino sugerido (`destinoReferenciaId`);
   - destino copiado en la planificacion (`destinoVenta`);
   - referencia al precio sugerido (`precioReferenciaId`);
   - valor copiado en la planificacion (`precioVentaEstimado`);
   - indicador de modificacion manual (`precioVentaManual`).

La planificacion aprobada no debe depender dinamicamente del precio de referencia. Si el precio de referencia cambia despues, debe servir para calcular vistas actualizadas, no para reescribir el supuesto original sin accion explicita.

## Margen planificado y margen actualizado

Se deben distinguir dos miradas:

- Margen bruto planificado: usa el precio y costos copiados al momento de planificar o aprobar.
- Margen bruto actualizado: usa precios de referencia vigentes y, mas adelante, costos/avances reales si existen.

Esto permite responder dos preguntas distintas:

- Que margen esperaba cuando planifique.
- Que margen tendria hoy con precios actualizados.

## Protocolos productivos

Un protocolo es una plantilla reutilizable que describe como se espera producir un cultivo o actividad.

El protocolo debe tener un campo `descripcion` para que el usuario pueda identificar rapidamente su uso al asignarlo a un lote/actividad de la planificacion.

Campos principales del protocolo:

- `nombre`
- `descripcion`
- `actividadErpId`
- `especieErpId`
- `zonaErpId` opcional
- `zonaPlanificacionId` opcional
- `campoPlanificacionId` opcional
- `campaniaErpId` opcional
- `empresaErpId` opcional
- `activo`

Reglas de seleccion en planificacion:

- El protocolo siempre depende de la actividad seleccionada.
- Puede estar restringido por zona y/o campo.
- Si no tiene campo asociado, aplica a todos los campos compatibles segun zona/actividad.
- Si no tiene zona ni campo, aplica como protocolo general de la actividad.
- El select de protocolo debe mostrar solo protocolos compatibles.
- El orden del select debe ser por ultima modificacion descendente (`updatedAt desc`) y, si no existe, por fecha de creacion descendente.
- Al cambiar actividad, zona/campo o lote, el sistema puede proponer el protocolo compatible mas reciente.

Regla de copia:

- Un usuario autorizado debe poder crear un protocolo nuevo copiando uno existente.
- La copia debe generar un nuevo protocolo independiente, no una version editable del protocolo original.
- El nombre sugerido debe indicar que es una copia, por ejemplo `Girasol tecnologia media - copia`.
- La copia debe conservar cabecera, etapas, labores, insumos, costos y descripcion como punto de partida.
- La copia debe registrar `protocoloOrigenId` para trazabilidad.
- La copia debe quedar editable y permitir cambiar actividad, zona, campo, descripcion, etapas, labores e insumos.
- Modificar la copia no debe modificar el protocolo original.
- Modificar el protocolo original no debe modificar copias ya creadas ni planificaciones que usaron una copia.
- La accion de copiar debe auditarse indicando usuario, fecha, protocolo origen y protocolo nuevo.

Ejemplos de descripcion:

- `Soja primera - tecnologia media - campo Pieres`
- `Trigo pan - planteo fertilizacion alta`
- `Girasol - bajo uso de insumos`

## Estructura de un protocolo

Un protocolo se compone de etapas. Cada etapa puede tener labores e insumos.

Etapas sugeridas:

- barbecho;
- preparacion;
- siembra;
- fertilizacion;
- proteccion;
- monitoreo;
- cosecha;
- post cosecha.

Cada etapa deberia incluir:

- `orden`
- `nombre`
- `descripcion`
- labores previstas;
- insumos previstos;
- costo estimado por hectarea;
- observaciones.

## Labores del protocolo

Las labores representan tareas o servicios necesarios.

Campos sugeridos:

- `nombre`
- `descripcion`
- `unidad`
- `cantidadPorHa`
- `costoUnitario`
- `costoPorHa`
- `momentoEstimado`

Ejemplos:

- siembra;
- pulverizacion;
- fertilizacion;
- cosecha;
- labor contratista;
- monitoreo.

## Insumos del protocolo

Los insumos representan productos necesarios para ejecutar el protocolo.

Campos sugeridos:

- `insumoPlanificacionId`
- `insumoErpId` opcional
- `nombre`
- `tipo`
- `unidad`
- `dosisPorHa`
- `precioUnitarioEstimado`
- `costoPorHa`
- `momentoEstimado`

Tipos sugeridos:

- semilla;
- fertilizante;
- herbicida;
- fungicida;
- insecticida;
- coadyuvante;
- otros.

La fuente ideal de insumos sera el ERP. Agro App guarda una copia local del padron `ErpInsumo`, pero tambien debe permitir crear insumos provisorios para no bloquear el armado de protocolos.

Cuando un insumo se agrega a un protocolo, debe copiarse el precio/costo estimado a la linea del protocolo. El protocolo no debe depender dinamicamente del precio ERP porque una planificacion aprobada debe conservar sus supuestos economicos.

Si luego el insumo provisorio se vincula con un insumo ERP, esa vinculacion no debe modificar protocolos o planificaciones aprobadas/cerradas sin accion explicita.

## Implementacion MVP de protocolos

Para el primer MVP, la edicion completa de protocolos se realiza desde web.

Alcance implementado en modo demo:

- pantalla web `Protocolos`;
- grilla web de protocolos para comparar y seleccionar;
- creacion de protocolo nuevo en memoria demo;
- copia de protocolo existente como nuevo protocolo independiente;
- edicion de cabecera: nombre, actividad, campo opcional y descripcion;
- alta de etapas;
- alta y edicion simple de labores;
- alta y edicion simple de insumos;
- recalculo automatico de costo productivo estimado por hectarea;
- guardado de protocolo contra backend demo;
- exposicion de resumen en mobile como consulta.

Proximo ajuste de UX:

- agregar busqueda y filtros por actividad, zona/campo y estado;
- crear endpoint especifico `POST /planificacion/protocolos` para altas reales;
- crear endpoint especifico `POST /planificacion/protocolos/:id/copiar` para copia auditada en backend;
- mostrar origen de copia con nombre legible del protocolo origen.

Backend demo:

- `GET /planificacion/protocolos/snapshot`
- `PUT /planificacion/protocolos/:id`

En modo demo, `PUT /planificacion/protocolos/:id` tambien permite guardar protocolos nuevos si el `id` no existia previamente. En persistencia real conviene separar altas, modificaciones y copias en endpoints distintos para simplificar permisos, validaciones y auditoria.

La persistencia real queda prevista para PostgreSQL. Cuando exista base de datos, cada guardado debe generar eventos de auditoria con usuario, fecha, entidad, valores previos, valores nuevos, origen y motivo cuando aplique.

Decision UX:

- web es el entorno principal para armar protocolos porque requiere grillas y carga intensiva;
- mobile muestra consulta/resumen para validar datos de campo sin forzar una experiencia pesada;
- el usuario comun podra consultar o usar protocolos, pero no modificarlos salvo permiso especifico futuro;
- la modificacion de protocolos globales requiere permiso `planificacion:configurar`.

## Relacion entre planificacion y protocolo

La planificacion referencia un protocolo, pero debe poder ajustar valores por lote.

Regla propuesta:

- El protocolo funciona como plantilla base.
- Al asignarlo a una fila de planificacion, se copian sus etapas, labores e insumos a una version editable de la planificacion.
- Los cambios hechos en una planificacion no modifican el protocolo original.
- Si se modifica el protocolo original, no debe alterar planificaciones ya aprobadas sin accion explicita del usuario.

Esto evita cambios retroactivos peligrosos y mejora la trazabilidad.

## Seguridad y permisos

- Usuarios autorizados pueden crear y modificar protocolos base.
- Usuario comun puede usar protocolos solo en campos/lotes asignados.
- Usuario comun no puede modificar protocolos globales salvo permiso futuro especifico.
- Toda planificacion debe validar en backend que el usuario tenga acceso al `campoErpId`/`loteErpId`.
- Los valores economicos pueden ser sensibles; deben respetar `clienteId` y permisos.
- Toda edicion debe quedar auditada: planificacion, lineas, protocolos, etapas, labores, insumos, costos, precios, rindes, gastos y cambios de estado.

## Auditoria esperada

Eventos minimos:

- creacion de planificacion;
- modificacion de una linea de planificacion;
- asignacion o reemplazo de protocolo;
- cambio de rinde estimado;
- cambio de precio de venta;
- cambio de precio de referencia;
- modificacion manual del precio sugerido;
- cambio de destino sugerido;
- modificacion manual del destino de venta;
- cambio de gastos comerciales;
- cambio de insumos o costos;
- aprobacion o cierre de planificacion;
- intento de modificacion sobre una planificacion cerrada cuando sea relevante para seguridad;
- modificacion de protocolo base.

Cada evento debe registrar usuario, fecha/hora, entidad, accion y valores antes/despues cuando aplique.

El guardado de borrador desde la planilla debe auditarse en backend cuando exista persistencia real.

## Pendientes de definicion

- Si los gastos comerciales seran un total simple o una grilla por concepto desde el MVP.
- Catalogo inicial de destinos de venta.
- Si el destino sugerido se define por zona, campo, actividad, cultivo o combinaciones con prioridad.
- Fuente inicial de precios: manual, ERP, mercado o combinada.
- Si el protocolo sera por cultivo, actividad, especie o combinacion.
- Si el costo de labores vendra de ERP, se cargara manualmente o ambas.
- Unidad de rinde por cultivo: tn/ha, kg/ha, qq/ha u otra.
- Moneda de planificacion y tipo de cambio si corresponde.
