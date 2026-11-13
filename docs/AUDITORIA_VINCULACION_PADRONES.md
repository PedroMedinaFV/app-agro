# Vinculacion y datos maestros de padrones

Revision: 2026-11-13. Complementa [IDENTIDAD_PADRONES_ERP.md](IDENTIDAD_PADRONES_ERP.md). Incluye zonas, campos, lotes, especies, actividades, insumos y labores. El usuario confirma aplicada la migracion de identidad; esta revision no agrega migraciones.

## Regla funcional

Vincular confirma que un registro App y uno ERP representan la misma entidad. Se conserva el ID App, el cliente, la autoria y las referencias operativas. Se absorbe exclusivamente una copia automatica intacta, con alias y auditoria transaccionales. El ERP gobierna los datos maestros detallados abajo; los atributos exclusivos de Agro App siguen siendo propios.

El usuario confirmo conservar precios/costos propios. Por tanto, vincular un insumo/labor existente conserva tambien su moneda: no se cambia la moneda de un importe sin convertirlo. La sincronizacion tampoco reemplaza esos supuestos. Un guardado posterior sobre el mismo vinculo si permite editar expresamente precio/costo y moneda desde sus campos propios.

Si ERP cambia la unidad tecnica, el importe propio se conserva numericamente: no hay conversion automatica entre unidades ni monedas. Debe revisarse el importe por la nueva unidad desde su edicion propia. Las dosis/unidades ya guardadas en protocolos no se convierten como efecto secundario de vincular o sincronizar.

| Padron | Datos gobernados por ERP al vincular y sincronizar | Datos App conservados |
| --- | --- | --- |
| Zonas | Nombre y codigo interno | ID, cliente, autoria y relaciones |
| Campos | Nombre, codigo, empresa y zona ERP/App correspondiente | ID, cliente, autoria y referencias desde lotes/planificacion |
| Lotes | Nombre, codigo, campo App correspondiente, superficie total y productiva | ID, cliente, autoria, geografia y referencias operativas |
| Especies | Nombre y codigo | ID, cliente, autoria y referencias desde actividades |
| Actividades | Nombre, codigo y especie ERP/App cuando ERP la informa | Tipo de grano, tipo de cultivo y epoca de siembra; especie App si ERP no informa especie |
| Insumos | Nombre, codigo, ID/tipo de insumo y unidad | Precio estimado y moneda propios, ID y relaciones |
| Labores | Nombre, codigo, ID/tipo de servicio, descripcion abreviada, ID/unidad, imputa dosis, activo, origen y fecha ERP | Costo sugerido y moneda propios, ID y relaciones |

Los codigos se normalizan igual que al materializar, conservando ceros iniciales; si no existe codigo se usa el nombre normalizado. Para lotes, una superficie productiva ERP nula usa la total, mientras que cero se conserva como cero. No se aceptan superficies negativas, no finitas o productivas mayores a total.

Las relaciones se resuelven por ID ERP y cliente, nunca por nombre. Un padre requerido ausente devuelve 409 y exige sincronizar/vincular primero ese padre. No se fabrica un ID ni se confirma otra vinculacion por similitud. Una unidad ERP con ID sin catalogo tambien devuelve 409. El tipo de insumo sin descripcion importada conserva su ID y usa `Tipo <id>` como texto.

Las zonas/campos/especies/lotes vinculados muestran sus datos maestros como solo lectura. Actividades, insumos y labores ya distinguian datos ERP de atributos propios en sus formularios. Las relaciones provenientes de ERP prevalecen en servidor incluso ante requests manuales.

## Inconsistencias encontradas y corregidas

- Los seis padrones restantes validaban existencia ERP pero persistian datos provisorios enviados por cada pantalla. Ahora ambos puntos de vinculacion usan la misma proyeccion de servidor dentro de la transaccion.
- La materializacion creaba faltantes, sin refrescar los vinculos existentes. Ahora actualiza solo las columnas maestras que difieren para el cliente sincronizado, con auditoria.
- Aceptar una sugerencia de actividad omitia tipo de grano/cultivo/epoca y podia borrarlos. Ahora los conserva.
- Insumos y labores desde sus pantallas reemplazaban precios/costos propios por valores ERP al vincular. Se corrigio el cliente y el servidor conserva los valores persistidos durante la transicion, incluso ante una pantalla desactualizada.
- Aceptar una labor desde Notificaciones podia reemplazar la moneda de un costo propio; desvincular desde el panel central podia borrarla. Ambos caminos conservan la moneda propia.
- Una copia nueva de insumo asignaba USD a un importe ERP sin consultar su moneda. Ahora utiliza la moneda importada por ID. En copias nuevas de insumos/labores no se inicializa un importe ERP cuya moneda no pueda resolverse. Esto no modifica importes de registros App existentes.

## Modulos y transacciones

- `services/planificacion/datosMaestrosPadronesErp.ts`: proyecciones tipadas de los seis padrones y resolucion de padres/catalogos. Carga mapas por cliente/catalogo una vez por operacion, evitando consultas por cada padre en una sincronizacion.
- `services/zonas/datosZonaErp.ts`: proyeccion de zona compartida con su guardado.
- Servicios `*AppPrisma.ts`: validaciones de propietario/compatibilidad, consolidacion, resolucion ERP, preservacion de valores propios, guardado y auditoria. No se confia en nombre/codigo/tipo/unidad recibidos para un vinculo.
- `services/planificacion/sincronizarDatosMaestrosPadrones.ts`: refresco de los siete padrones existentes, con lecturas por lote y sin escribir registros sin diferencias. Se ejecuta despues de crear padres/hijos faltantes, bajo el lock y transaccion existentes.
- `services/notificaciones/vinculacionesSugeridas.ts`: confirma por los mismos servicios de guardado y conserva atributos propios.

Si falta la fuente en cache, el refresco conserva el registro App. No se eliminan registros ni se desvinculan automaticamente. No se reescriben snapshots de planificaciones cerradas, protocolos guardados ni evidencia historica. Actualizar la superficie maestra tampoco cambia las hectareas ya guardadas en una linea de planificacion. Los errores revierten la transaccion completa.

La sincronizacion refresca tambien referencias inactivas presentes en cache; no convierte una baja ERP en borrado App. Solo labores tiene una columna `activo` propia que permita reflejarla. La disponibilidad general de bajas para los otros selectores no se redefine en esta revision.

## Verificacion y operacion

- `tests/padrones-datos-maestros.test.js`: aislamiento de padres, padres ausentes, null/cero en superficies, datos invalidos, unidades faltantes y exclusiones de columnas economicas.
- `tests/integration/padrones-maestros.js`, registrado por la suite HTTP existente: seis padrones por Padrones y por Notificaciones, consolidacion/aliases, atributos propios, importes/monedas distintos a los ERP y refresco de vinculos previos sin tocar provisorios u otro cliente. Verifica auditoria idempotente.
- Los escenarios anteriores de zonas, rollback, aliases offline y materializacion/desvinculacion siguen en la suite.

La evidencia de ejecucion se registra en [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md); la existencia del test no implica que se haya ejecutado.

Cierre de validacion 2026-11-13: `pnpm check` aprobado (287 tests aprobados/1 opcional omitido y todos los builds). Suite completa HTTP/PostgreSQL: 21 escenarios aprobados, sin fallos/omisiones; 35 migraciones aplicadas y schema temporal eliminado. No se modificaron padrones operativos.

Para actualizar vinculos existentes, reiniciar API/web con el codigo actualizado y ejecutar sincronizacion ERP del cliente. No requiere otra migracion ni desvincular/recrear entidades. La sincronizacion cambiara sus datos maestros segun esta matriz; sus precios/costos propios se conservaran. Falta el recorrido manual en navegador con datos operativos reales: vincular cada tipo por ambos caminos, comprobar respuestas/tabla/selector y verificar persistencia despues de recargar. Los tests usan fixtures aislados, sin modificar padrones operativos.
