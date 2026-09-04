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

Tambien se integra `Padrones/UnidadesMedida` del ERP para seleccionar unidades en labores e insumos. La unidad se elige desde el padron ERP y se copia como codigo operativo en Agro App.

## Padrones base no registrados en ERP

La planificacion no debe bloquearse si un padron base aun no existe en el ERP.

Agro App debe permitir crear registros provisorios para:

- zonas;
- campos;
- lotes;
- especies;
- actividades;
- insumos.

Al crear un campo provisorio, la zona se selecciona desde un padron combinado de zonas ERP sincronizadas y zonas propias creadas en Agro App. No se carga como texto libre para evitar errores de escritura y facilitar la vinculacion posterior.

Al crear un lote provisorio, el campo se selecciona desde los campos propios de Agro App. Ese campo puede estar vinculado al ERP o seguir provisorio, pero el lote no debe quedar sin campo operativo. El lote guarda superficie total y superficie productiva; la superficie productiva no puede superar la superficie total.

La pantalla web de `Lotes` debe cargar los campos propios desde el backend de padrones (`/campos-planificacion`) y los campos ERP sincronizados desde la cache local al abrirse, no desde el snapshot demo de planificacion. Esto evita que el select muestre datos incompletos cuando ya existen campos reales persistidos o sincronizados.

Si al crear un lote el usuario selecciona un campo ERP que todavia no tiene su registro operativo en `CampoPlanificacion`, la web debe crear primero ese campo propio ya vinculado al ERP y luego guardar el lote asociado. Ambas acciones deben pasar por backend y auditoria. Para el usuario, el flujo debe verse como una sola accion de guardado del lote.

Cuando el registro aparezca mas adelante en los padrones del ERP, un usuario autorizado debe poder vincular el registro provisorio con el registro ERP correspondiente.

La vinculacion no debe alterar planificaciones historicas sin accion explicita y siempre debe quedar auditada.

Esta regla no aplica para datos operativos como `Agricultura/Cultivos`. Esos datos se importan desde ERP y no se crean como padron base provisorio en Agro App.

## Vinculador asistido con ERP

Despues de cada sincronizacion de padrones ERP, el backend debe buscar coincidencias entre registros provisorios de Agro App y registros nuevos o actualizados del ERP.

Si encuentra una posible coincidencia, el sistema debe:

- crear una sugerencia de vinculacion;
- guardar el puntaje y los criterios de coincidencia;
- guardar una copia del registro ERP sugerido para revision;
- notificar a administradores o usuarios con permiso de vinculacion;
- permitir aceptar o rechazar desde una pantalla de comparacion;
- auditar la decision.

Para el MVP, la vinculacion no debe ejecutarse automaticamente. El sistema propone y el usuario autorizado confirma.

Esto aplica a:

- zonas;
- campos;
- lotes;
- especies;
- actividades;
- insumos.

El modelo detallado se define en `docs/MODELO_PLANIFICACION_V1.md`.

## Planilla de planificacion

Cada fila de la planilla representa una decision productiva sobre un lote para una campania.

La experiencia principal de carga debe ser tipo planilla/Excel en web:

- la pantalla principal debe mostrar un listado/resumen de planificaciones, no la grilla pesada directamente;
- cada planificacion muestra nombre, campania, estado, hectareas, resumen economico y margen;
- si la planificacion no esta cerrada y el usuario tiene permiso, se habilita un boton `Editar`;
- al editar, se abre una vista de edicion de pantalla completa dentro de la app, no un modal, porque la planilla tiene mucha densidad de datos;
- la cabecera permite editar nombre, descripcion y campania;
- permitir agregar varias lineas rapidamente;
- seleccionar la campania a la que pertenece la planificacion desde la cabecera;
- editar campo, lote, actividad, destino, hectareas, rinde, precio, gastos comerciales y protocolo desde la grilla;
- usar select dependientes: primero campo y luego lotes filtrados por ese campo;
- al agregar una nueva linea, proponer por defecto el campo de la linea anterior;
- seleccionar destino de venta desde una tabla de destinos disponibles;
- recalcular ingresos, costos y margen bruto en vivo;
- recalcular los gastos comerciales sugeridos cuando cambian hectareas o rinde, siempre que la linea conserve una referencia de gastos;
- si el usuario edita manualmente el importe de gastos comerciales, la linea deja de depender de la referencia sugerida para no sobrescribir su decision;
- al cambiar la campania de la planificacion, se buscan nuevamente gastos comerciales compatibles con esa campania; si no existen, el gasto de la linea queda en cero para carga manual;
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
- `actividadErpId` opcional
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

`zonaPlanificacionId`, `campoPlanificacionId`, `lotePlanificacionId` y `actividadPlanificacionId` son las referencias operativas principales de Agro App. Pueden apuntar a registros ya vinculados al ERP o a registros provisorios creados para no bloquear la planificacion. Los campos `zonaErpId`, `campoErpId`, `loteErpId`, `actividadErpId`, `especieErpId` e `insumoErpId` quedan como vinculos opcionales al ERP.

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
- `campaniaErpId`
- `empresaErpId`
- `zonaPlanificacionId` opcional
- `zonaErpId` opcional
- `campoPlanificacionId` opcional
- `campoErpId` opcional
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `destinoVenta` opcional
- `descripcion`
- `items`
- `activo`

Cada item debe incluir:

- `conceptoGastoComercialId`
- `conceptoNombre`
- `valorPorTonelada`
- `moneda`
- `observaciones` opcional

El concepto se selecciona desde el maestro `ConceptoGastoComercial`. No se permite carga libre en el flujo normal para evitar duplicados como `Flete`, `flete` o `FLETE`.

Decision MVP:

- Los gastos comerciales pertenecen a una campania agricola.
- Pueden aplicar a todas las zonas, a una zona especifica o a un campo especifico.
- Si se selecciona campo, ese alcance tiene prioridad sobre zona.
- Por simplicidad operativa, todos los gastos comerciales se cargan como valor por tonelada.
- Los items se cargan desde un select alimentado por un maestro de conceptos.
- No se expone `tipoCalculo` ni `unidad` en la pantalla inicial.
- Si mas adelante aparece la necesidad real, se podran reabrir tipos como por hectarea, porcentaje de ingreso o importe fijo.

Calculo:

```txt
produccionEstimadaTn = hectareasPlanificadas * rindeEstimado
gastosComercialesEstimados = produccionEstimadaTn * suma(valorPorTonelada)
```

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

Mientras la linea esta en borrador y mantiene `gastosComercialesReferenciaId`, la pantalla puede recalcular el importe estimado al modificar hectareas o rinde porque el gasto se define por tonelada. Si el usuario escribe un importe manual en la linea, se limpia la referencia y ese importe queda como supuesto manual copiado a la planificacion.

Estado UX actual:

- web cuenta con pantalla `Campos` para ver campos ERP sincronizados, crear campos propios y asignar zona desde select ERP/Agro App;
- web cuenta con pantalla `Lotes` para ver lotes ERP sincronizados y crear lotes propios asociados a campos propios;
- web cuenta con pantalla `Gastos` para administrar gastos comerciales de referencia por campania;
- web cuenta con pantalla `Padrones` para administrar el maestro de conceptos de gastos comerciales;
- web cuenta con pantalla `Padrones > Destinos` para administrar el catalogo maestro de destinos de venta;
- web cuenta con pantalla `Padrones > Labores` para administrar labores de referencia y altas provisorias;
- web cuenta con pantalla `Padrones > Insumos` para administrar insumos operativos propios y altas provisorias;
- la pantalla muestra la tabla de gastos como vista principal;
- la pantalla permite crear gastos desde un modal abierto por `Nuevo gasto`, con accion final `Guardar`;
- la pantalla permite editar gastos desde un boton de accion por fila, con accion final `Editar`;
- cada gasto se asocia a una actividad de planificacion y puede restringirse por destino, zona y/o campo;
- cada gasto contiene items editables con concepto maestro, valor por tonelada, moneda y observaciones opcionales;
- cada guardado/edicion desde el modal debe mostrar estado de carga, spinner y toast de confirmacion;
- la persistencia real usa endpoint `/gastos-comerciales-referencia/:id`;
- toda alta o edicion de gastos comerciales debe quedar auditada con usuario, fecha, valores anteriores, valores nuevos, origen y motivo;
- editar gastos comerciales no debe reescribir automaticamente planificaciones aprobadas o cerradas.

## Destinos de venta

La planificacion debe contar con un catalogo de destinos de venta.

Un destino de venta es unico por `clienteId` y `destinoVentaNormalizado`. No depende de actividad, cultivo, zona, campo ni empresa. Ejemplo: `Puerto Quequen`, `PUERTO QUEQUEN` y `Puerto Quequén` deben resolver al mismo destino.

Las reglas de sugerencia pueden usar zona, campo, actividad o cultivo para proponer un destino, pero esas dimensiones no definen la identidad del destino.

Esta tabla la configura un usuario autorizado y permite que, al crear una linea de planificacion, el sistema proponga automaticamente el destino de venta mas probable.

El objetivo principal es mejorar la experiencia de usuario: evitar que quien planifica tenga que cargar el destino del cereal en cada cultivo/lote de forma repetitiva. Esto reduce fatiga operativa, acelera la carga de la planilla y disminuye errores por seleccion manual.

Campos sugeridos:

- `clienteId`
- `destinoVenta`
- `destinoVentaNormalizado`
- `descripcion`
- `activo`

Regla de busqueda sugerida futura:

1. Buscar coincidencia por campo + actividad/cultivo.
2. Si no existe, buscar por zona + actividad/cultivo.
3. Si no existe, buscar por actividad/cultivo general.
4. Si no existe, dejar destino vacio para carga manual.

La prioridad, si hiciera falta, debe pertenecer a la regla de sugerencia futura. No se carga en el padron maestro de destinos para no agregar complejidad visible al usuario.

Al crear una linea de planificacion:

- el sistema guarda `destinoReferenciaId` si encontro una configuracion;
- copia `destinoVenta` a la linea;
- permite al usuario modificar el destino;
- marca `destinoVentaManual` cuando el usuario se aparta de la sugerencia.

La planificacion aprobada debe conservar el destino utilizado originalmente. Si luego cambia la tabla de destinos sugeridos, no debe modificarse la planificacion historica sin accion explicita.

## Precios de referencia

Los precios de referencia son una entidad transversal de Agro App. No pertenecen exclusivamente a planificacion.

La planificacion agricola los consume para proponer precios de venta por cereal/cultivo, actividad y destino de venta, pero otros modulos tambien podran usarlos para analisis, seguimiento comercial, margen actualizado u otras vistas operativas.

Esta tabla permite:

- proponer automaticamente un precio de venta al crear un cultivo planificado;
- conservar el precio usado originalmente en la planificacion;
- actualizar valores durante la campania;
- recalcular un margen bruto actualizado sin perder el margen planificado original.

Campos sugeridos:

- `clienteId`
- `empresaErpId` opcional
- `actividadErpId`
- `especieErpId`
- `cultivoErpId` opcional
- `destinoVenta`
- `valor`
- `moneda`
- `unidad`
- `fuente`
- `observaciones`
- `activo`
- `createdAt`
- `updatedAt`

Decision sobre campania y fechas:

- el precio de referencia no pertenece a una campania;
- la fecha de creacion se genera automaticamente al crear el registro;
- la fecha de actualizacion se genera automaticamente al modificarlo;
- la pantalla no debe pedir fecha manual para evitar carga innecesaria.

Decision sobre tipo de precio:

El campo `tipoPrecio` no queda en la UI del MVP. Podria servir mas adelante para distinguir valores de mercado, forward, fijados o estimados, pero hoy agrega complejidad sin resolver una necesidad inmediata. Para el MVP, la clasificacion operativa queda representada por `fuente`.

Fuentes sugeridas:

- `manual`
- `erp`
- `mercado`
- `importacion`

Estado UX actual:

- web cuenta con pantalla `Precios` para administrar precios de referencia por actividad y destino;
- la pantalla muestra la tabla de precios como vista principal;
- la pantalla permite crear precios desde un modal abierto por `Nuevo precio`, con accion final `Guardar`;
- la pantalla permite editar precios desde un boton de accion por fila, con accion final `Editar`;
- el destino se selecciona desde un catalogo y permite crear uno nuevo si no existe;
- si se crea un destino nuevo desde el modal de precios, debe guardarse tambien como `DestinoVentaReferencia` unico por cliente y nombre de destino;
- el backend normaliza el destino con trim, espacios simples, sin tildes y uppercase para evitar duplicados por escritura del usuario;
- la creacion automatica del destino debe auditarse igual que la creacion o edicion del precio;
- esos precios quedan disponibles para proponer valores al crear lineas de planificacion;
- cada guardado/edicion desde el modal debe mostrar estado de carga, spinner y toast de confirmacion;
- la persistencia real de precios usa endpoint transversal `/precios-referencia/:id`;
- toda alta o edicion de precio debe quedar auditada con usuario, fecha, valores anteriores, valores nuevos, origen y motivo;
- editar un precio de referencia no debe reescribir automaticamente planificaciones aprobadas o cerradas.

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
- `campaniaErpId`
- `actividadPlanificacionId`
- `actividadErpId` opcional
- `tipoFecha`
- `fechaSiembra` opcional
- `zonaPlanificacionId` opcional
- `campoPlanificacionId` opcional
- `empresaErpId` opcional
- `activo`

No se guarda `especieErpId` en el protocolo porque la especie se obtiene desde la actividad. Esto evita duplicar informacion y previene inconsistencias si una actividad cambia de vinculacion o se corrige en el padron.

`campaniaErpId` es obligatorio porque los costos, labores e insumos pueden cambiar entre campanias. Si se necesita un protocolo reutilizable para otra campania, debe copiarse y ajustarse.

`tipoFecha` se define una sola vez al crear el protocolo. Puede ser `absoluta` o `relativa_siembra`.

`fechaSiembra` se usa como fecha base cuando el protocolo trabaja con fechas relativas a siembra. Puede quedar vacia mientras el protocolo esta en armado, pero debe completarse antes de aprobar/cerrar una planificacion que use ese protocolo.

Para alcance geografico, el protocolo usa `zonaPlanificacionId` y/o `campoPlanificacionId`. La zona de planificacion es la referencia operativa propia de Agro App y puede estar vinculada o no al ERP. `zonaErpId` queda como dato de vinculacion dentro del padron de zona/campo, no como referencia directa del protocolo.

Reglas de seleccion en planificacion:

- El protocolo siempre depende de la actividad de planificacion seleccionada. Si esa actividad ya esta vinculada al ERP, tambien conserva `actividadErpId` como dato de integracion.
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

## Padron inicial de estadios

Mientras no exista integracion ERP para estadios, Agro App usa un padron semilla inicial.

Origen inicial:

- archivo `AlborExcel.xlsx`;
- hoja unica;
- columnas `ID_Estadio`, `ID_Actividad`, `Codigo`, `Nombre`, `Orden_Cronologico`, `ID_Empresa`, `Activo`.

Campos operativos:

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

- El padron se carga al inicio como `origen = semilla`.
- Cada etapa del protocolo debe seleccionar un estadio del padron.
- Al seleccionar un estadio, la etapa copia `estadioReferenciaId`, `estadioCodigo`, `nombre` y `ordenCronologico`.
- Un protocolo no debe repetir el mismo estadio mas de una vez, salvo que en el futuro se agregue una dimension explicita que lo justifique.
- Si mas adelante existe endpoint ERP, el padron se podra sincronizar como `origen = erp` sin romper protocolos ya creados.
- Los protocolos historicos conservan el estadio usado originalmente.

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
- `fechaObjetivo` si la fecha es absoluta;
- `diasDesdeSiembra` si la fecha es relativa a siembra;
- labores previstas;
- insumos previstos;
- costo estimado por hectarea;
- observaciones.

Tipos de fecha del protocolo:

- `absoluta`: todas las etapas del protocolo cargan una fecha concreta. Ejemplo: `2026-09-15`.
- `relativa_siembra`: todas las etapas del protocolo se calculan en relacion con la fecha de siembra. Ejemplo: `-30` dias para barbecho o `20` dias para una aplicacion posterior.

Reglas de fecha:

- Si el protocolo tiene `tipoFecha = absoluta`, cada etapa debe tener `fechaObjetivo`.
- Si el protocolo tiene `tipoFecha = relativa_siembra`, cada etapa debe tener `diasDesdeSiembra`.
- `diasDesdeSiembra` debe ser un numero entero y puede ser negativo, cero o positivo.
- La etapa `Siembra` o `Siembra directa` debe tener `diasDesdeSiembra = 0` cuando se usa fecha relativa.
- Si el protocolo relativo tiene una etapa `Siembra` o `Siembra directa`, `fechaSiembra` es obligatoria en la cabecera.
- Si no hay `fechaSiembra`, las etapas relativas pueden guardarse como plantilla, pero no deben generar calendario operativo definitivo.

Edicion esperada en web:

- agregar, eliminar y reordenar etapas;
- editar estadio, nombre visible, descripcion y observaciones;
- editar fecha absoluta o dias desde siembra segun el tipo de fecha del protocolo;
- agregar y quitar labores;
- seleccionar labores desde padron;
- editar indice de aplicacion, cantidad, unidad, costo unitario y costo por hectarea de labores;
- agregar y quitar insumos;
- seleccionar insumos desde padron ERP o padron propio futuro;
- editar indice de aplicacion, dosis, unidad, precio unitario y costo por hectarea de insumos;
- validar errores antes de enviar al backend.

Labores e insumos:

- No deben cargarse como texto libre por defecto.
- Las labores deben seleccionarse desde un padron de labores.
- Los insumos deben seleccionarse desde el padron de insumos ERP cuando exista.
- Las unidades de labores e insumos deben seleccionarse desde `Padrones/UnidadesMedida` cuando el snapshot ERP lo tenga disponible.
- Las labores se sincronizan desde `Padrones/Servicios` del ERP cuando esten disponibles.
- Mientras una labor no exista en el ERP, Agro App permite crearla como provisoria para no bloquear protocolos.
- Cuando la labor aparezca en el ERP, Agro App debe proponer una vinculacion simple y auditada.
- `indiceAplicacion` indica el coeficiente de aplicacion de la labor o insumo dentro de la etapa.
- `indiceAplicacion` debe ser un numero decimal entre `0` y `1`.
- Por defecto, `indiceAplicacion = 1`, equivalente al 100% del requerimiento.
- El indice ajusta requerimientos y costos. Ejemplo: si una etapa usa `2 L/ha` de 2.4D y `indiceAplicacion = 0.5`, el requerimiento efectivo es `1 L/ha`.
- El costo por hectarea de labores se calcula como `cantidadPorHa * costoUnitario * indiceAplicacion`.
- El costo por hectarea de insumos se calcula como `dosisPorHa * precioUnitarioEstimado * indiceAplicacion`.

## Labores del protocolo

Las labores representan tareas o servicios necesarios.

La fuente ERP sera `Padrones/Servicios`. En Agro App se gestionan como padron propio porque una labor puede necesitarse antes de estar dada de alta en el ERP.

La unidad sugerida de la labor se selecciona desde `Padrones/UnidadesMedida` y se guarda como codigo copiado, por ejemplo `Ha`, `Hs` o `Unid`.

Campos sugeridos:

- `laborReferenciaId`
- `servicioErpId` opcional
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

Flujo de alta provisoria y vinculacion:

1. Si la labor no existe en el ERP, un usuario autorizado la crea en Agro App.
2. La labor queda como `provisorio` y puede usarse en protocolos.
3. Al sincronizar `Padrones/Servicios`, el backend busca coincidencias por codigo y descripcion normalizada.
4. Si encuentra una coincidencia, genera una sugerencia y notificacion.
5. El usuario autorizado confirma la vinculacion.
6. La labor queda vinculada al servicio ERP sin modificar historicos ya copiados en protocolos o planificaciones cerradas.

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

La administracion web del padron se realiza desde `Padrones > Insumos`. Un usuario autorizado puede crear o editar nombre, codigo interno, empresa, tipo, unidad, precio estimado, moneda y estado de vinculacion.

La unidad del insumo se selecciona desde `Padrones/UnidadesMedida` y se guarda como codigo copiado, por ejemplo `Lts`, `Kgs`, `Bls` o `Unid`.

Cuando un insumo se agrega a un protocolo, se selecciona desde el padron operativo `InsumoPlanificacion`. La linea del protocolo copia `insumoPlanificacionId`, `insumoErpId`, nombre, tipo, unidad y precio/costo estimado. El protocolo no debe depender dinamicamente del precio ERP porque una planificacion aprobada debe conservar sus supuestos economicos.

La dosis y el precio unitario copiados quedan editables dentro del protocolo para representar condiciones puntuales sin modificar el padron maestro.

Si luego el insumo provisorio se vincula con un insumo ERP, esa vinculacion no debe modificar protocolos o planificaciones aprobadas/cerradas sin accion explicita.

## Implementacion MVP de protocolos

Para el primer MVP, la edicion completa de protocolos se realiza desde web.

Alcance implementado en modo demo:

- pantalla web `Protocolos`;
- grilla web de protocolos como vista principal;
- creacion de protocolo nuevo desde modal;
- copia de protocolo existente como nuevo protocolo independiente desde modal;
- edicion de cabecera desde modal: nombre, actividad, campo opcional y descripcion;
- alta de etapas desde modal;
- alta de labores desde `Padrones > Labores`;
- copia de nombre, unidad y costo sugerido de la labor al protocolo;
- edicion de cantidad y costo unitario copiados para ajustar el supuesto economico del protocolo;
- pantalla `Padrones > Insumos` para administrar insumos operativos;
- alta de insumos desde el padron operativo de insumos;
- copia de nombre, tipo, unidad y precio sugerido del insumo al protocolo;
- edicion de dosis y precio unitario copiados para ajustar el supuesto economico del protocolo;
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

Endpoints de persistencia real previstos para protocolos:

- `GET /planificacion/protocolos/snapshot`
- `POST /planificacion/protocolos`
- `PUT /planificacion/protocolos/:id`
- `POST /planificacion/protocolos/:id/copiar`

`POST` crea protocolos, `PUT` modifica protocolos existentes o guarda borradores con id definido por el cliente, y `copiar` crea un protocolo independiente con `protocoloOrigenId`.

En modo demo, `PUT /planificacion/protocolos/:id` tambien permite guardar protocolos nuevos si el `id` no existia previamente. En persistencia real se separan altas, modificaciones y copias para simplificar permisos, validaciones y auditoria.

La persistencia real queda prevista para PostgreSQL. Cuando exista base de datos, cada guardado debe generar eventos de auditoria con usuario, fecha, entidad, valores previos, valores nuevos, origen y motivo cuando aplique.

Estado tecnico actual:

- existe servicio backend Prisma para listar, crear, modificar y copiar protocolos;
- las operaciones reales generan auditoria transaccional;
- si todavia no hay datos persistidos, la consulta de protocolos puede devolver snapshot demo para no bloquear validacion web/mobile;
- existe servicio backend Prisma para guardar planificaciones y lineas;
- la planilla valida duplicados por campania, campo, lote y actividad de planificacion;
- el cierre de planificacion se ejecuta desde backend y bloquea ediciones posteriores;
- los intentos relevantes de modificar una planificacion cerrada registran auditoria `bloquear_edicion`;
- la web ya permite cerrar una planificacion desde la planilla cuando el usuario tiene permiso `planificacion:cerrar`;
- si la base de datos no esta disponible, la web puede simular el cierre localmente para validar experiencia de usuario, pero ese cierre no reemplaza la auditoria real;
- si todavia no hay datos persistidos, la consulta de planificacion puede devolver snapshot demo para no bloquear validacion web/mobile.

Endpoints de persistencia real para planificacion:

- `GET /planificacion/snapshot`
- `PUT /planificacion/:id`
- `POST /planificacion/:id/cerrar`

## Persistencia real V1

La base de datos queda preparada en Prisma para persistir los datos propios de planificacion.

Tablas principales agregadas:

- `ZonaPlanificacion`
- `CampoPlanificacion`
- `LotePlanificacion`
- `EspeciePlanificacion`
- `ActividadPlanificacion`
- `InsumoPlanificacion`
- `EstadioFenologicoReferencia`
- `LaborReferencia`
- `ProtocoloProductivo`
- `ProtocoloEtapa`
- `ProtocoloLabor`
- `ProtocoloInsumo`
- `PlanificacionAgricola`
- `PlanificacionAgricolaLinea`
- `DestinoVentaReferencia`
- `PrecioReferencia`
- `GastosComercialesReferencia`
- `VinculacionErpSugerida`
- `NotificacionUsuario`
- `AuditoriaEvento`

Decision de modelo:

- los padrones operativos de Agro App son la referencia principal;
- los `erpId` son opcionales y sirven para vincular con el ERP cuando exista el dato;
- la planificacion y los protocolos no dependen de que el ERP tenga todos los padrones cargados;
- el backend puede sugerir vinculaciones despues de sincronizar padrones ERP;
- la vinculacion definitiva requiere confirmacion de usuario autorizado;
- la unicidad de lineas se controla por planificacion, campo, lote y actividad de planificacion;
- el cierre de planificacion debe bloquear modificaciones desde backend;
- toda alta, edicion, copia, vinculacion y cierre debe registrar un evento en `AuditoriaEvento`.

La migracion inicial de este modulo queda en `apps/api/prisma/migrations/20260813000000_planificacion_protocolos`.

Decision UX:

- web es el entorno principal para armar protocolos porque requiere grillas y carga intensiva;
- la vista principal de protocolos debe ser un listado limpio;
- crear, editar y copiar protocolos se realiza en un modal amplio, consistente con precios, gastos comerciales y padrones maestros;
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

- Catalogo inicial de destinos de venta.
- Si el destino sugerido se define por zona, campo, actividad, cultivo o combinaciones.
- Fuente inicial de precios: manual, ERP, mercado o combinada.
- Si el protocolo sera por cultivo, actividad, especie o combinacion.
- Si el costo de labores vendra de ERP, se cargara manualmente o ambas.
- Unidad de rinde por cultivo: tn/ha, kg/ha, qq/ha u otra.
- Moneda de planificacion y tipo de cambio si corresponde.
