# Concurrencia y recuperacion de sincronizaciones ERP

Actualizado: 2026-11-06, etapa 4. Implementacion y pruebas de unidad disponibles. Migracion en el entorno objetivo y validacion PostgreSQL real pendientes: la conexion de desarrollo no estuvo disponible durante la prueba aislada.

## Proposito y comportamiento

Una sincronizacion manual debe tener un solo propietario por cliente, independientemente del proceso API o CLI que la ejecute. Un reinicio no debe perder la evidencia de la corrida ni dejar un bloqueo permanente. Una ejecucion antigua que retoma despues de perder su reserva no debe continuar escribiendo.

Se reemplaza el `Set` del endpoint por una reserva PostgreSQL con token y vencimiento. El mismo coordinador sirve a `POST /erp/sincronizar`, la importacion administrativa de empresas y ambos CLI de sincronizacion. Se mantienen los permisos HTTP y las respuestas de exito existentes. Los CLI ahora requieren `--clienteId=...` o `CLIENTE_ID`.

Si el cliente ya esta ocupado, se responde `409` sin iniciar otra importacion. Los padrones maestros `Erp*` incluyen registros globales que se borran y recargan: durante el trabajo tambien se toma una puerta global para impedir dos refrescos destructivos concurrentes, incluso entre clientes distintos. Esa contencion devuelve `409` con mensaje de padrones compartidos; se reintenta despues de terminar la otra corrida.

## Modelo persistente

La migracion `20261106120000_bloqueo_sincronizacion_erp` agrega `ErpSincronizacionBloqueo`:

| Campo | Uso |
| --- | --- |
| `clienteId` (PK) | Una reserva como maximo por cliente |
| `token` | UUID aleatorio distinto por intento; evita que una ejecucion vieja libere la nueva |
| `sincronizacionId` | Identificador del historial asociado |
| `adquiridoEn` | Fecha del servidor PostgreSQL al reservar |
| `venceEn` | Limite calculado con reloj PostgreSQL y TTL configurado |

El historial ya existente conserva usuario, items solicitados/ejecutados, resultado, detalles y error. El modelo de reserva usa IDs de trazabilidad sin nuevas relaciones de borrado en cascada; no se cambia la retencion del historial.

## Protocolo y transacciones

1. Adquirir una puerta `pg_try_advisory_xact_lock` del cliente en una transaccion corta. Si otra instancia la tiene, devolver ocupado inmediatamente.
2. Leer la reserva con `FOR UPDATE`. Si esta vigente, devolver ocupado. Si vencio, marcar su historial anterior como error de ejecucion interrumpida, solo si todavia estaba `en_proceso`.
3. Crear el historial nuevo y reemplazar la reserva con otro token en la misma transaccion corta. La reserva/historial sobreviven un cierre posterior del proceso.
4. Abrir una transaccion de trabajo con tiempo maximo; tomar las puertas del cliente y cache global y validar token, historial y vigencia antes de ejecutar.
5. Ejecutar importacion, padrones derivados y finalizacion del historial en esa transaccion. Comprobar nuevamente la vigencia antes del commit.
6. En error, revertir las escrituras del trabajo y marcar su historial como fallido fuera de la transaccion revertida. No modificar un historial ya finalizado.
7. Liberar la reserva condicionando por cliente, token e historial. Si falla la limpieza, registrar el fallo en servidor: la siguiente adquisicion podra recuperar la reserva al vencer. No ocultar el error original ni convertir un exito ya confirmado en un fallo de importacion.

Las puertas advisory son transaccionales y estan namespaced por `current_schema()`, ademas del cliente o cache global. No necesitan una conexion de sesion retenida por fuera de la transaccion; se liberan al commit/rollback o cuando PostgreSQL detecta la desconexion. Las colisiones de hash solo pueden provocar contencion adicional, no habilitar dos propietarios.

## Contexto transaccional y escrituras antiguas

Los servicios existentes llaman otros servicios y abren transacciones propias. Un token revisado solo al principio no seria suficiente si esas llamadas siguieran usando el cliente Prisma global.

`contextoTransaccional.ts` usa AsyncLocalStorage para dirigir las consultas del flujo ERP al `TransactionClient` protegido. `prisma.ts` exporta un proxy que fuera de ese contexto conserva el cliente normal. Requests concurrentes ajenas al ERP no heredan la transaccion. Dentro del contexto, las transacciones anidadas se unen a la unidad de trabajo existente; los arrays se ejecutan en orden. No se crean savepoints.

Una transaccion expirada permanece cerrada: el proxy no vuelve al cliente global como fallback. Esto impide que un callback demorado persista cambios despues del vencimiento, incluso si una nueva instancia ya recupero la reserva. Las llamadas externas ya iniciadas no se cancelan automaticamente; pueden terminar, pero sus escrituras posteriores fallan en la transaccion cerrada.

Para extender el flujo, usar el `prisma` exportado por `src/prisma.ts` y entrar por `ejecutarSincronizacionErp`. No crear otro PrismaClient dentro del trabajo ni invocar los importadores de bajo nivel directamente desde rutas o CLI. Un cliente independiente escaparia de la proteccion.

## Tiempo maximo y escalabilidad

`ERP_SYNC_LOCK_TTL_MS` es un entero de 10000 a 3600000 ms; por defecto 300000 (cinco minutos). La API valida el rango al arrancar. La transaccion de trabajo tiene timeout de TTL menos un segundo y la reserva tambien se revisa al terminar. No hay renovacion indefinida ni heartbeat.

Decision de esta etapa: incluir el trabajo completo, incluso lecturas remotas, en una transaccion acotada para proteger tambien todos los escritores indirectos existentes. Esto consume una conexion mientras se consulta el ERP y serializa los refrescos de cache global; debe dimensionarse el pool y medirse el tiempo real antes del despliegue. Los timeouts de infraestructura pueden ser menores que este TTL y tambien provocar rollback.

Para importaciones que excedan el limite, seleccionar menos padrones por corrida o ajustar el TTL dentro del rango despues de medirlo. La evolucion hacia jobs de larga duracion debe separar descarga y aplicacion, manteniendo la validacion del propietario y las escrituras dentro de transacciones protegidas. No agregar un heartbeat que permita renovar un trabajador detenido sin control.

La cache global preexistente supone maestros compartidos. Si se incorporan fuentes ERP independientes por cliente, se necesita particionar esa cache por fuente para evitar reemplazos entre integraciones distintas; este bloqueo previene concurrencia destructiva pero no cambia ese modelo de datos.

## Puesta en marcha y recuperacion

Con la base correcta disponible, revisar/aplicar migraciones pendientes y regenerar Prisma Client antes de usar la sincronizacion:

```powershell
pnpm --filter agro-app-api db:deploy
pnpm --filter agro-app-api prisma:generate
pnpm --filter agro-app-api prisma:validate
```

`db:deploy` aplica todas las migraciones pendientes de la base configurada, no solamente esta. No se ejecuto contra la base de aplicacion durante esta etapa porque no estuvo accesible. Sin la tabla nueva, la sincronizacion falla; no existe fallback a bloqueo en memoria.

CLI desde la raiz:

```powershell
pnpm --filter agro-app-api erp:sync -- --clienteId=<clienteId> --items=campos,lotes
pnpm --filter agro-app-api erp:sync:empresas -- --clienteId=<clienteId>
```

Ante una interrupcion: esperar el vencimiento y que PostgreSQL cierre la transaccion anterior, luego reintentar. La recuperacion es bajo demanda, al adquirir la siguiente reserva; no es un scheduler de reintentos ni un barrido inmediato de todos los historiales. Si la transaccion sigue activa, se mantiene la exclusion. No borrar manualmente una reserva activa para forzar otra corrida.

Un historial `completada` cuya liberacion fallo se conserva como completado cuando se recupera su reserva. Si una corrida fallo antes de confirmar el trabajo, su cache/padrones/detalles de esa unidad se revierten juntos; el registro inicial de historial permanece para diagnostico.

## Verificacion y evidencia

`pnpm test` cubre el coordinador, fallos de limpieza, contencion, reserva vencida, propietario antiguo y contexto transaccional con dependencias sustituidas. Los tests de adaptador verifican las condiciones de las queries, pero no demuestran por si solos la exclusion de PostgreSQL.

`tests/erp-bloqueo-postgres.test.js` habilita una prueba real cuando se define `ERP_LOCK_TEST_DATABASE_URL`. Crea un schema de nombre aleatorio propio, instala la migracion y tablas minimas de prueba, usa dos clientes independientes y elimina solo ese schema al terminar. No migra tablas de aplicacion. La cuenta de testing necesita permiso de crear/eliminar schemas.

```powershell
# Definir ERP_LOCK_TEST_DATABASE_URL en el entorno sin versionar sus credenciales.
pnpm test
```

Escenarios reales preparados: adquisicion simultanea con un ganador, recuperacion de historial vencido, rechazo de token antiguo, liberacion vieja que no borra una reserva nueva, rollback completo, timeout que no vuelve al cliente global, contencion mientras otro trabajo esta activo y puerta de maestros compartidos.

El intento real del 2026-11-06 fallo por falta de conexion con PostgreSQL antes de crear el schema. En la suite habitual esta prueba se informa como omitida si no se configura su URL. La migracion y estos escenarios siguen pendientes de aprobacion real; no se considera cerrada la etapa 4 respecto de ese criterio.
