# Identidad de padrones App y ERP

Implementacion: 2026-11-06. Cierre de validacion: 2026-11-10. Correccion de duplicados en selectores y disponibilidad inconsistente entre padrones y notificaciones.

## Problema y regla funcional

La cache ERP conserva datos importados. La planificacion materializa esos registros como entidades App para disponer de IDs operativos y atributos propios. Una especie ERP y su copia App **representan la misma identidad**, aunque se haya editado el nombre o agregado atributos App.

Los selectores deben ofrecer una sola opcion por vinculo ERP: conservar la version App y omitir la opcion ERP representada. Se mantienen ID App y referencia ERP para guardar relaciones correctas. No se deduplica por nombre/codigo: dos registros homonimos, dos empresas o un provisorio sin vinculo no son automaticamente la misma entidad. La coincidencia textual solo propone una vinculacion que debe confirmarse.

Se distinguen tres situaciones:

| Situacion | Disponibilidad para vincular un provisorio |
| --- | --- |
| ERP sin entidad App | Disponible, si cumple compatibilidad de empresa/padre |
| ERP con copia App automatica sin ediciones | Disponible para consolidacion explicita; la copia no equivale a una decision de usuario |
| ERP vinculado a un registro manual o copia editada | Ocupado; no se reemplaza ni se descartan cambios |

Esto corrige el caso de una zona provisoria creada antes de sincronizar: la copia materializada de esa zona ERP no debe impedir que el usuario confirme la identidad.

## Selector y estado de pantalla

`packages/tipos/src/padronesIdentidad.ts` centraliza identidad, disponibilidad, IDs materializados y reemplazo del estado despues de un guardado. Los DTO de los siete padrones agregan `vinculoAutomatico?: boolean`, calculado exclusivamente por backend; enviar ese flag no concede permiso de consolidar.

Una copia automatica debe tener ID materializado reconocido y carecer de `createdBy`/`updatedBy`. Se reconocen IDs historicos y el nuevo formato con cliente, componentes escapados y UUID. Las entidades ya existentes conservan sus IDs; no hay recodificacion masiva. Los nuevos IDs evitan colisiones entre clientes y no se reciclan al desvincular y volver a materializar, preservando los aliases anteriores.

Superficies revisadas:

| Pantalla/flujo | Comportamiento |
| --- | --- |
| Actividades → especie | Omite ERP representado por App y conserva la seleccion al editar una actividad con referencia solo ERP |
| Precios | Ya omitia especies ERP representadas; se conserva su clave ERP y el ID App asociado |
| Gastos comerciales | Actividades/zonas/campos ya excluian ERP representado por App; mantienen ambos IDs |
| Campos → zona | Una opcion por referencia ERP; provisorios sin vinculo permanecen separados |
| Lotes → campos/formulario/filtros | Se elimina el bypass que volvia a incluir la opcion ERP vinculada en filtros |
| Protocolos y planificacion | Consumen padrones App del snapshot; no concatenan nuevamente la cache ERP |
| Mobile | Consulta snapshot App. Los IDs capturados antes de una consolidacion se resuelven por alias al llegar a la API |
| Vinculacion de zonas, campos, lotes, especies, actividades, insumos y labores | Usa disponibilidad que excluye unicamente vinculos confirmados/ediciones, no copias automaticas intactas |

Tras guardar se elimina del estado visible la copia absorbida y se invalidan caches de snapshots/protocolos. Con sesion real, un error de API al guardar insumos/labores devuelve fallo y mantiene el formulario; no se presenta una vinculacion local ficticia como guardada. El fallback previo sin sesion conserva su alcance de demostracion local.

Los contadores de **Vinculos confirmados** excluyen copias automaticas. El panel central distingue **Copia ERP automatica**, **Vinculada** y **Provisoria**, e incorpora un filtro de copias; esas copias muestran disponibilidad para vincular un provisorio en lugar de acciones para desvincularlas como si fueran decisiones de usuario.

## Consolidacion transaccional

El guardado de cada padron llama a `services/planificacion/consolidarCopiaErp.ts` dentro de su transaccion:

1. Bloquear el cliente con advisory lock transaccional PostgreSQL. La materializacion usa el mismo lock para no recrear copias durante una vinculacion.
2. Verificar en base el ocupante del ERP. Solo se absorbe una copia automatica sin ediciones; otro ocupante devuelve 409. El destino debe ser un provisorio existente del mismo cliente.
3. Trasladar referencias de la copia al ID App del provisorio. Se leen las FK declaradas en Prisma y se agregan explicitamente IDs escalares sin FK de gastos/destinos. Referencias directas inconsistentes entre clientes cancelan la operacion.
4. Eliminar exclusivamente esa copia, registrar alias anterior → actual y auditar ambos IDs. No se borran registros de negocio referenciados ni objetos de Storage.
5. Guardar el vinculo ERP y atributos solicitados, con auditoria habitual. Si falla cualquier paso, se revierte el conjunto, incluidos referencias, alias y auditoria.

Los snapshots JSON historicos y la auditoria anterior son evidencia del momento original y no se reescriben. Los IDs operativos con FK si se trasladan. Colisiones entre relaciones unicas requieren revision: no se elige ni se borra una linea/protocolo para forzar la union.

El alcance incluye los siete padrones. Las validaciones de empresa, cliente, zona/campo padre y especie se conservan en sus servicios. Una coincidencia de nombre no omite estas validaciones.

## Compatibilidad de IDs y offline

`AliasPadronApp` conserva por cliente/tipo el ID absorbido y el canonico. `middleware/aliasesPadrones.ts` se ejecuta despues de autenticacion en los routers de aplicacion y normaliza referencias conocidas en body/query/ruta. No permite usar alias de otro cliente y no cambia `registroMovilId` ni el ID local de los envios offline.

Si una lluvia/observacion pendiente guardo el campo/lote de una copia anterior, el backend recibe el mismo ID movil para idempotencia y resuelve sus referencias al registro canonico. Las cadenas de alias se aplanan al consolidar nuevamente. No borrar esta tabla al desplegar o limpiar cache: sigue siendo necesaria para clientes con pendientes antiguos.

Los servicios internos deben trabajar con IDs actuales. Nuevas entradas HTTP que usen otros nombres para referencias deben incorporarlos explicitamente al middleware; no existe un reemplazo arbitrario de cualquier texto/ID en JSON.

Web/mobile codifican con `encodeURIComponent` cada ID al construir segmentos de URL. El ID original se conserva en JSON y en almacenamiento; Express debe decodificarlo una sola vez al resolver parametros. Esto importa porque los IDs materializados contienen componentes escapados: interpolarlos sin codificar en una ruta cambiaba el valor recibido por backend.

## Sugerencias y notificaciones

`services/notificaciones/vigenciaSugerencias.ts` verifica existencia/estado del provisorio, candidato activo, compatibilidad y ocupante actual. El generador usa la misma distincion entre copia automatica y vinculo confirmado. Antes de listar se cierran sugerencias obsoletas y sus avisos pendientes, conservando historial con motivo; no se borran notificaciones historicas.

Aceptar una sugerencia vuelve a validar vigencia bajo lock. Vinculo, consolidacion, alias, auditoria y resolucion de notificacion comparten transaccion mediante el contexto Prisma ya existente. No se aplica un candidato tomado solamente de un snapshot viejo. Si el destino esta ocupado por una edicion, se devuelve conflicto y la siguiente consulta retira el aviso obsoleto.

Una vinculacion manual desde el padron tambien vuelve obsoletas sus sugerencias anteriores: al consultar notificaciones dejan de aparecer. Descartar sigue siendo una decision explicita del usuario. No se reactiva automaticamente una sugerencia que el usuario descarto.

## Migracion y puesta en marcha

Migracion nueva: `20261106140000_identidad_padrones_erp`. Crea aliases e indices unicos cliente/ERP en seis padrones; servicios ya tenia ese indice. No vincula registros ni elimina duplicados existentes. El SQL se ejecuta en una transaccion y falla si encuentra duplicados previos en lugar de elegir uno.

Estado operativo comprobado con `db:status` el 2026-11-10: esta migracion sigue pendiente en `agro_app`. Las pruebas aisladas no la aplican en ese schema.

Antes del deploy, revisar por cada tabla el equivalente de esta consulta (solo lectura):

Diagnostico ejecutado el 2026-11-06 sobre la base de desarrollo: cero grupos duplicados cliente/ERP en los siete padrones; siete zonas App, una provisoria y seis copias automaticas. La consulta no modifico datos ni aplico la migracion operativa. Esto confirma la diferencia entre copias materializadas y decisiones de vinculacion del usuario.

```sql
SELECT "clienteId", "zonaErpId", count(*)
FROM agro_app."ZonaApp"
WHERE "zonaErpId" IS NOT NULL
GROUP BY "clienteId", "zonaErpId"
HAVING count(*) > 1;
```

Repetir para CampoApp/campoErpId, LoteApp/loteErpId, EspecieApp/especieErpId, ActividadApp/actividadErpId e InsumoApp/insumoErpId. Ante resultados, revisar referencias/ediciones antes de migrar; no borrar filas automaticamente.

Aplicar schema antes de arrancar esta API y publicar el cliente actualizado. En Windows detener previamente la API de desarrollo si mantiene bloqueado `query_engine-windows.dll.node`; no terminar otros procesos Node indiscriminadamente:

```powershell
pnpm --filter agro-app-api db:deploy
pnpm --filter agro-app-api prisma:generate
pnpm --filter agro-app-api db:status
```

Luego reiniciar API/web y recargar la pantalla. El contador total versionado pasa de 34 a 35 migraciones. La migracion no confirma por su cuenta la sugerencia de la zona del usuario: esa decision permanece manual y auditada.

## Verificacion

- `tests/padrones-identidad.test.js`: prioridad App por vinculo, homonimos separados, IDs por cliente sin colisiones de separadores, copias historicas/nuevas, bloqueo de copias editadas y limpieza del estado visible.
- `tests/padrones-api-rutas.test.js`: adaptadores web/mobile reales, segmentos de URL con IDs reservados, body sin alteraciones y preservacion del token mobile.
- `tests/integration/api.integration.test.js`: zona provisoria + copia materializada + referencia de campo + sugerencia; guardado HTTP, traslado, auditoria y retirada del aviso. Consolidacion y rollback reales en los siete padrones, aliases en body/ruta, ingreso offline con IDs anteriores y rechazo de otro cliente. Aceptacion por notificacion, conflicto ante copia editada y ciclo materializar/vincular/desvincular/revincular para dos clientes sin reciclar aliases.
- `pnpm check`: lint, contratos/tipos, suite rapida y builds.
- `pnpm test:integration`: migraciones desde cero y PostgreSQL/HTTP reales en schema temporal; no aplica la migracion al schema operativo.

Recorrido manual despues de instalar: abrir Actividades y comprobar una sola especie por vinculo; abrir filtros de Lotes y revisar campos; crear una zona provisoria de testing, sincronizar/materializar ERP, confirmar su vinculo y revisar campos dependientes y Notificaciones. Repetir con una copia editada y confirmar que aparece un conflicto que conserva ambos registros. No marcar este recorrido aprobado solo por compilar o ejecutar tests de servidor.

La evidencia final y pendientes operativos se registran en [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md).
