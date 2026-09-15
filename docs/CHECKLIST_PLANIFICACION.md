# Checklist de cierre - Planificacion agricola

Este documento sirve para validar el proceso completo de planificacion antes de darlo por cerrado para MVP. La idea es ir tildando con datos reales y anotar desvíos concretos.

## 1. Datos base

- [ ] Hay empresas ERP seleccionadas para el cliente.
- [ ] La sincronizacion ERP carga campanias reales.
- [ ] La sincronizacion ERP carga zonas, campos y lotes reales.
- [ ] Los lotes propios/provisorios se muestran junto con los ERP cuando corresponde.
- [ ] Campos y lotes respetan permisos del usuario.
- [ ] Actividades reales estan disponibles en padrones.
- [ ] Especies reales estan disponibles en padrones.
- [ ] Insumos reales estan disponibles en padrones.
- [ ] Servicios/labores reales estan disponibles en padrones.
- [ ] Monedas y unidades de medida reales estan disponibles.
- [ ] Destinos estan disponibles desde `DestinoApp`.
- [ ] Precios estan disponibles desde `PrecioApp`.
- [ ] Gastos comerciales estan disponibles desde su maestro real.

## 2. Padrones necesarios para planificar

- [ ] Se puede crear zona provisoria desde Agro App.
- [ ] Se puede crear campo provisorio desde Agro App.
- [ ] Se puede crear lote provisorio desde Agro App.
- [ ] Se puede vincular zona/campo/lote provisorio contra ERP.
- [ ] Al vincular, el registro provisorio deja de aparecer como duplicado operativo.
- [ ] Las vinculaciones se pueden consultar.
- [ ] Las vinculaciones se pueden desvincular y volver a vincular si hubo error.
- [ ] Los registros ERP no editables quedan bloqueados cuando corresponde.
- [ ] Todo registro creado desde Agro App queda en estado provisorio hasta vincularse.
- [ ] Los padrones globales no obligan al usuario a elegir empresa.

## 3. Precios, destinos y gastos

- [ ] Se puede crear destino propio.
- [ ] Los destinos ERP/importados no se pueden editar.
- [ ] Se puede crear precio para actividad/destino/campania.
- [ ] El precio guarda correctamente valor decimal.
- [ ] El precio queda disponible en planificacion.
- [ ] Se puede crear concepto de gasto comercial.
- [ ] El concepto tiene unidad de calculo clara.
- [ ] Se puede crear gasto comercial por campania.
- [ ] El gasto puede ser general, por zona o por campo.
- [ ] El gasto puede restringirse por destino si corresponde.
- [ ] El gasto guarda correctamente valores decimales.
- [ ] Al cambiar destino en una linea, se recalculan gastos sugeridos compatibles.
- [ ] Si no hay gasto compatible, la linea queda en cero o manual claro.

## 4. Protocolos productivos

- [ ] Se puede crear protocolo con campania real.
- [ ] Se puede editar protocolo existente.
- [ ] Se puede copiar protocolo como protocolo independiente.
- [ ] El protocolo referencia actividad real/provisoria de Agro App.
- [ ] El protocolo puede restringirse por zona/campo.
- [ ] Las etapas usan estadios reales del maestro.
- [ ] Se pueden agregar y quitar etapas.
- [ ] Se pueden agregar y quitar labores.
- [ ] Se pueden agregar y quitar insumos.
- [ ] El indice de aplicacion acepta valores entre 0 y 1.
- [ ] El indice de aplicacion por defecto es 1.
- [ ] Costos/precios de labores e insumos no son editables desde protocolo.
- [ ] Costos/precios se toman del padron correspondiente.
- [ ] El costo estimado por ha se recalcula correctamente.
- [ ] Fechas relativas permiten dias negativos.
- [ ] Si el protocolo requiere fecha de siembra, se valida antes de cierre.
- [ ] Guardar protocolo queda auditado.

## 5. Creacion de escenario

- [ ] Se puede crear escenario desde resumen de planificaciones.
- [ ] El escenario pide nombre.
- [ ] El escenario pide campania real.
- [ ] El escenario se persiste inmediatamente como borrador.
- [ ] Al crear, se precargan lotes activos disponibles.
- [ ] La precarga usa superficie productiva por defecto.
- [ ] Las lineas se agrupan por zona y campo.
- [ ] La pantalla inicia contraida o en una vista manejable.
- [ ] Se puede expandir/contraer por zona.
- [ ] Se puede expandir/contraer campos dentro de zona.
- [ ] Se puede copiar una linea para doble cultivo.
- [ ] Se puede copiar escenario completo.
- [ ] La copia queda como borrador independiente.
- [ ] Se puede agregar una zona al escenario sin modificar padrones.
- [ ] Se puede agregar un campo al escenario sin modificar padrones.
- [ ] Se puede agregar un lote al escenario sin modificar padrones.
- [ ] Se puede quitar una zona del escenario sin eliminar el padron.
- [ ] Se puede quitar un campo del escenario sin eliminar el padron.
- [ ] Se puede quitar un lote/linea del escenario sin eliminar el padron.
- [ ] Quitar zona/campo/lote con datos cargados pide confirmacion clara.
- [ ] Agregar zona/campo/lote evita duplicar lineas ya existentes en el escenario.
- [ ] Altas/bajas de alcance del escenario quedan auditadas.

## 6. Editor de planificacion

- [ ] El editor carga rapido con datos reales.
- [ ] El editor no dispara requests duplicados innecesarios.
- [ ] El filtro por zona funciona.
- [ ] El filtro por campo funciona.
- [ ] El filtro por estado de carga funciona.
- [ ] El buscador por zona/campo/lote/protocolo/destino funciona.
- [ ] Cada linea muestra lote.
- [ ] Cada linea muestra antecesor de campania anterior.
- [ ] El antecesor puede mostrar fina y segunda si existen.
- [ ] Cada linea permite seleccionar protocolo compatible.
- [ ] Al seleccionar protocolo se define actividad.
- [ ] Al cambiar protocolo se actualiza costo.
- [ ] Al volver a "Sin protocolo" se limpian valores derivados.
- [ ] Cada linea permite seleccionar destino real.
- [ ] Al seleccionar destino se propone precio compatible.
- [ ] Precio sugerido considera actividad y destino.
- [ ] Si no hay precio compatible, queda en cero o manual claro.
- [ ] Rinde acepta decimales.
- [ ] Precio acepta decimales.
- [ ] Hectareas acepta decimales.
- [ ] Gastos comerciales aceptan decimales.
- [ ] Los numeros se redondean/muestran con 2 decimales donde corresponde.
- [ ] Si hectareas supera maximo permitido, muestra alerta y no corrige silenciosamente.
- [ ] No permite guardar hectareas negativas.
- [ ] No permite guardar valores economicos negativos.
- [ ] Lineas sin protocolo no suman hectareas planificadas.
- [ ] Lineas completas quedan visualmente diferenciadas de pendientes.
- [ ] Pendientes por zona/campo se muestran en resumen.
- [ ] Duplicados por lote/actividad se detectan.

## 7. Calculos economicos

- [ ] Produccion estimada = hectareas * rinde.
- [ ] Ingreso bruto = produccion estimada * precio.
- [ ] Gastos comerciales se calculan segun unidad definida.
- [ ] Ingreso neto = ingreso bruto - gastos comerciales.
- [ ] Costo productivo = costo protocolo * hectareas.
- [ ] Margen bruto = ingreso neto - costo productivo.
- [ ] Totales de escenario suman solo lineas aplicables.
- [ ] Resumen por zona coincide con suma de lineas.
- [ ] Resumen por campo coincide con suma de lineas.
- [ ] Resumen general coincide con suma de zonas/campos.
- [ ] Los valores guardados son los mismos que se muestran al reabrir.

## 8. Guardado

- [ ] Se puede guardar borrador con lineas incompletas.
- [ ] El guardado persiste todas las lineas reales.
- [ ] El guardado en bloque soporta volumen real de lotes.
- [ ] Si falla el backend, la UI no simula exito.
- [ ] Si falla el backend, los botones vuelven a habilitarse.
- [ ] Reabrir el escenario muestra exactamente lo guardado.
- [ ] La auditoria registra creacion de escenario.
- [ ] La auditoria registra edicion relevante de escenario.
- [ ] La auditoria no guarda payloads masivos innecesarios.

## 9. Cierre de planificacion

- [ ] El cierre se ejecuta desde una accion explicita por escenario.
- [ ] La confirmacion muestra nombre, campania y resumen del escenario.
- [ ] No se puede cerrar si no hay hectareas planificadas.
- [ ] No se puede cerrar si hay lineas invalidas.
- [ ] No se puede cerrar si una linea excede superficie permitida.
- [ ] No se puede cerrar si faltan datos obligatorios.
- [ ] Si backend rechaza el cierre, la UI no bloquea edicion incorrectamente.
- [ ] Al cerrar, el escenario queda como `cerrada`.
- [ ] Al cerrar, el escenario queda como `escenarioOriginal = true`.
- [ ] Los otros escenarios de la misma campania quedan `deshabilitada`.
- [ ] Los escenarios deshabilitados no se pueden editar.
- [ ] Los escenarios deshabilitados no se pueden cerrar.
- [ ] Una planificacion cerrada no se puede editar.
- [ ] El backend bloquea modificaciones aunque la UI falle.
- [ ] El cierre queda auditado.
- [ ] El intento de editar cerrada queda auditado cuando corresponde.

## 10. Seguridad y permisos

- [ ] Admin puede configurar padrones y planificaciones.
- [ ] Planificador puede crear/editar/cerrar segun permisos definidos.
- [ ] Operador de campo no puede modificar planificacion.
- [ ] Usuario con campos asignados solo ve sus campos/lotes.
- [ ] Backend valida cliente en cada operacion.
- [ ] Backend valida alcance de campo/lote en operaciones sensibles.
- [ ] Microsoft login toma rol y campos desde configuracion del usuario.
- [ ] Demo admin no oculta errores reales de persistencia.

## 11. Mobile y seguimiento operativo

- [ ] Mobile muestra campos/lotes asignados.
- [ ] Mobile muestra ficha del lote.
- [ ] Mobile muestra planificacion asociada al lote.
- [ ] Mobile muestra protocolo/cultivo asignado.
- [ ] Mobile muestra supuestos comerciales principales como solo lectura.
- [ ] Seguimiento operativo web muestra ficha del lote.
- [ ] Seguimiento operativo web muestra cultivos ERP.
- [ ] Seguimiento operativo web muestra planificaciones asociadas.
- [ ] Seguimiento operativo web muestra precipitaciones y observaciones.
- [ ] La informacion mobile coincide con la web para el mismo lote.

## 12. UX y performance

- [ ] Planificacion no carga snapshot pesado al iniciar sesion si no hace falta.
- [ ] Entrar a planificacion es aceptablemente rapido.
- [ ] Entrar al editor es aceptablemente rapido.
- [ ] Cambiar inputs no genera demoras perceptibles.
- [ ] Acciones backend muestran spinner bloqueante.
- [ ] Tablas usan estilo consistente.
- [ ] Acciones de tabla estan al final.
- [ ] Botones de accion usan iconos.
- [ ] La pantalla se adapta a desktop angosto.
- [ ] La pantalla se adapta a mobile web.
- [ ] No hay overflow horizontal inesperado.
- [ ] Mensajes de error son comprensibles para usuario final.

## Pendientes detectados / notas

- [ ] Validar si la planificacion debe copiar detalle completo de labores/insumos del protocolo o solo costo resumido.
- [ ] Definir si el limite de hectareas debe ser superficie productiva o total. Recomendacion actual: productiva por defecto y nunca mayor a total.
- [ ] Validar con datos reales grandes si las acciones masivas son suficientes.
- [ ] Revisar permisos finales para rol `responsable_compras` o equivalente.
- [ ] Decidir si reabrir planificacion cerrada queda fuera de MVP o requiere permiso especial futuro.
