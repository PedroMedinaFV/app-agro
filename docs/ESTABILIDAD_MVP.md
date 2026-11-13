# Estabilidad MVP

Fecha de corte historico: 2026-11-10. Actualizacion 2026-11-13: el usuario confirma aplicada la migracion de identidad App/ERP y resuelto el problema de padrones. Siguen pendientes el recorrido de dispositivo de etapa 3 y la primera corrida hospedada de CI. La correccion adicional de datos maestros de zonas se describe en `IDENTIDAD_PADRONES_ERP.md`.

Este documento resume el estado tecnico para dejar una version estable antes de seguir con nuevas features.

## Estado actual

Anexos de planificacion, 2026-11-13: implementados alta desde original cerrada, editor compartido, alcance/reservas por lote, cierre con actividad/protocolo compatibles, numeracion consecutiva, consolidado con tabla/CSV y fichas web/mobile. `pnpm check` completo aprobado: **291 tests, 290 aprobados, 0 fallidos y 1 PostgreSQL opcional omitido**, tipos de cuatro workspaces y builds API/web/Expo web-iOS-Android. Se repitieron tipos/lint y build web al completar la tabla/gestion de errores del consolidado. La guia `ANEXOS_PLANIFICACION.md` detalla reglas, contratos, modulos, instalacion y recorrido manual.

Integracion completa posterior: **24 escenarios aprobados, 0 fallidos, 0 omitidos**, aproximadamente 926 segundos de tests mas migraciones. Replay de **36 migraciones**, incluida `20261113120000_anexos_planificacion`; eliminacion de `agro_integration_test_431fe80ebaa748d29a5413d85578f3be` confirmada. Verifica borradores incompletos y retiro explicito, lotes disponibles para anexo, preservacion de original, permisos, cierres concurrentes, numeracion sucesiva y traslado de reservas/alcance al consolidar un lote ERP; aliases no permiten duplicar una incorporacion ya aprobada. Las regresiones previas de auth, aislamiento, operativo, offline, planificacion y padrones tambien aprobaron.

Antes de la corrida completa se aprobaron los dos escenarios iniciales de anexos en aproximadamente 178 segundos, con replay de 36 migraciones y eliminacion de `agro_integration_test_4b204ebddcdb41eb8ac3fe2f294bd517`. Una primera pasada detecto un campo obligatorio faltante en el fixture de protocolo (`descripcion`); se corrigio el fixture antes de repetir. No se oculta ese fallo ni se modifica la validacion productiva para aceptar el fixture.

No se aplico la migracion nueva al schema operativo ni se crearon anexos reales. En Windows, Prisma genero tipos/metadata pero su comando de generacion no completo el reemplazo de la DLL por estar cargada en otro proceso; no se terminaron procesos del usuario. Las pruebas HTTP/PostgreSQL ejecutaron el cliente generado y el motor 5.22 existente. Detener la API antes de ejecutar `db:deploy`/`prisma:generate`/`db:status` y reiniciar API/web, segun la guia. Node tests y Vite requirieron salir del sandbox por `spawn EPERM`. El recorrido manual de navegador/dispositivo sigue pendiente; builds y tests no prueban camara, archivos nativos ni UX real.

Revision 2026-11-13 de los seis padrones restantes: `pnpm check` completo aprobado (lint, tipos de cuatro workspaces, 288 tests: 287 aprobados y 1 PostgreSQL opcional omitido, builds API/web y export Expo web/iOS/Android). Integracion nueva filtrada `--test-name-pattern=maestros ERP:`: 2 escenarios aprobados, 0 fallidos/omitidos, aproximadamente 262 segundos; el primer escenario incluye 12 combinaciones de padron/punto de vinculacion. Replay de 35 migraciones y eliminacion de `agro_integration_test_455a40bbb161436188b4a0fce9007520` confirmados. La matriz de datos maestros/atributos propios y limites operativos esta en `AUDITORIA_VINCULACION_PADRONES.md`. Esta evidencia no equivale a una prueba manual de navegador ni a una sincronizacion sobre los padrones operativos.

Cierre de la revision, 2026-11-13: suite completa de integracion ejecutada sin filtros sobre el codigo final; **21 aprobados, 0 fallidos, 0 omitidos**, aproximadamente 674 segundos de tests mas migraciones. Se verificaron los 12 caminos de vinculacion con importes/monedas ERP distintos a los propios, el refresco idempotente de los seis padrones y las regresiones de zonas, aliases, rollback, materializacion/desvinculacion, HTTP, permisos, offline, planificacion y ERP mock. Replay de las 35 migraciones y eliminacion de `agro_integration_test_705ebefcbcaf4f9ca073b886c2269f88` confirmados. Esta corrida completa en verde reemplaza la limitacion de la corrida de 18 escenarios del 2026-11-10; se conserva abajo como evidencia historica. No se modificaron padrones operativos ni se ejecuto una sincronizacion real del cliente. Sigue pendiente el recorrido manual en navegador documentado en `AUDITORIA_VINCULACION_PADRONES.md`.

Actualizacion 2026-11-13, datos maestros de zonas vinculadas: build API, TypeScript web y lint aprobados; `pnpm test` repetido con 284 aprobados, 0 fallidos y 1 opcional omitido. Integracion filtrada `--test-name-pattern=zona provisoria|aceptar sugerencia|zonas: sincronizacion`: 3 aprobados, 0 fallidos/omitidos, aproximadamente 118 segundos mas migraciones. Verifica datos ERP al vincular por HTTP/notificaciones, refresco de vinculos anteriores, aislamiento por cliente, preservacion de provisorios e idempotencia de auditoria. Las 35 migraciones se aplicaron en `agro_integration_test_8601d93f9133407c9a7200a34f7e1e93` y se confirmo su eliminacion. No se repitio la suite completa de integracion ni se modificaron zonas operativas. Node tests y PostgreSQL requirieron ejecucion fuera del sandbox por `spawn EPERM`/TLS, respectivamente. Prueba manual de la zona real: reiniciar API/web y sincronizar ERP, sin nueva migracion.

- Suite rapida: `pnpm test`; 285 tests, 284 aprobados, 0 fallidos, 1 omitido (PostgreSQL ERP opcional), repetida el 2026-11-10.
- Archivos de suite rapida: 52.
- Integracion del 2026-11-10: 18 escenarios ejecutados, 17 aprobados y uno interrumpido por cortes de conexion PostgreSQL; ese caso aprobo al repetirse aisladamente. No se presenta la corrida completa como aprobada.
- Hay 35 migraciones versionadas. Replay de las 35 y limpieza aprobados en la corrida de 17 escenarios; fixtures ficticios.
- Build API incluido en la suite: `pnpm --filter agro-app-api build`.
- Catalogo de tests documentado en `docs/CALIDAD_TESTS_MODULARIZACION.md`.

## Correccion de identidad App/ERP: estado al 2026-11-10

`pnpm check` completo aprobado nuevamente: lint, tipos de cuatro workspaces, 284 tests aprobados/1 omitido y builds API/web/mobile. Incluye los ultimos estados visibles de copias automaticas/vinculos confirmados y codificacion de IDs en rutas HTTP de web/mobile. La guia [IDENTIDAD_PADRONES_ERP.md](IDENTIDAD_PADRONES_ERP.md) documenta reglas, superficies revisadas, aliases y consolidacion.

`db:status` consultado el 2026-11-10 confirma que falta aplicar `20261106140000_identidad_padrones_erp` en `agro_app`. El codigo y los tests no equivalen a una instalacion operativa: esa migracion debe aplicarse antes de usar las nuevas vinculaciones. No se modificaron datos operativos ni se confirmo automaticamente la zona del usuario. El preflight de solo lectura del 2026-11-06 encontro cero grupos duplicados cliente/ERP, una zona provisoria y seis copias automaticas.

La corrida anterior de integracion aprobo 17/17. La ampliacion del 2026-11-10 aprobo consolidacion/rollback de los siete padrones, aliases offline/body/ruta, traslado de referencias y materializacion/vinculacion/desvinculacion/revinculacion para dos clientes. El caso de aceptar/rechazar notificaciones se interrumpio por conexiones reiniciadas por el host remoto (10054) y una transaccion expirada despues del corte (P2028); no se aumento su timeout ni se oculto el fallo. La ejecucion completa dio 17 aprobados/1 fallido en aproximadamente 593 segundos y confirmo la eliminacion de su schema temporal. El reintento aislado usa el mismo runner, migraciones y fixtures; no equivale a una corrida completa en verde.

Reintento aislado completado el 2026-11-10: `node scripts/run-integration-tests.js "--test-name-pattern=aceptar sugerencia"`, 1 aprobado, 0 fallidos, aproximadamente 58 segundos de test mas migraciones. El runner aplico las 35 migraciones y confirmo la eliminacion de `agro_integration_test_db6439d8a7724b7e8b0efa88405822f7`. Todos los escenarios nuevos tienen evidencia de aprobacion, conservando la limitacion de red observada en la corrida completa. La migracion operativa y el recorrido manual de las pantallas siguen pendientes.

## Evidencia historica de etapas 1 a 6

Verificaciones ejecutadas el 2026-11-06 con Node `v24.18.1` y pnpm `11.18.0` (ahora declaradas en `.nvmrc`/`packageManager`/`engines`):

| Comando | Resultado | Alcance |
| --- | --- | --- |
| `pnpm check` | Correcto, etapa 6 | Encadena lint, tipos, tests y builds; no incluye integracion PostgreSQL |
| `pnpm lint` | Correcto, sin errores ni warnings, etapa 6 | ESLint recomendado JS/TS, variables sin uso y reglas de hooks; excepciones documentadas |
| `pnpm typecheck` | Correcto, etapa 6 | Tipos compartidos y chequeo `--noEmit` en los cuatro workspaces |
| `pnpm test` | Correcto: 278 aprobados, 1 omitido, etapa 6 | Compila tipos/API/nucleo offline y ejecuta 50 archivos; incluye React y CLI Prisma |
| `pnpm test:integration` | Correcto: 14 aprobados, 0 omitidos, repetido en etapa 6 | App Express real, 34 migraciones, fixtures, HTTP/PostgreSQL y eliminacion del schema; tests HTTP de la ultima corrida: aproximadamente 127 segundos |
| `pnpm build` | Correcto, etapa 6 | Tipos, API, web Vite y exportacion Expo para web, iOS y Android |
| `pnpm --filter agro-app-mobile exec tsc --noEmit` | Correcto, etapa 3 | Chequeo TypeScript mobile, separado del bundle Expo |
| `pnpm --filter agro-app-api prisma:validate` | Schema valido, etapa 6 | Wrapper local sin shell; no aplica migraciones ni verifica conectividad |
| `pnpm --filter agro-app-api prisma:generate` | Correcto, etapa 4 | Prisma Client regenerado con el modelo nuevo |
| `pnpm --filter agro-app-api db:status` | Base actualizada, 34 migraciones, etapa 5 | Consulta real al schema `agro_app` despues de registrar compatibilidad; sin escrituras |
| `node --test tests/erp-bloqueo-postgres.test.js` con `ERP_LOCK_TEST_DATABASE_URL` | 1 aprobado, 0 fallidos, 0 omitidos | PostgreSQL real, schema temporal creado y eliminado; aproximadamente 29 segundos |

Los comandos que crean subprocesos se ejecutaron fuera del sandbox debido a su restriccion `spawn EPERM`. En etapa 6 se agregaron dependencias de desarrollo para ESLint y pruebas React, con versiones exactas; no se actualizaron dependencias de runtime. PostgreSQL y HTTP se verificaron con fixtures ficticios en schemas aislados; en agro_app solo se registro la compatibilidad no-op de etapa 5, sin cambios en datos de negocio. La suite usa ERP mock; la corrida del usuario con integracion real se registro por separado en etapa 4. Microsoft/Storage reales y dispositivo siguen fuera de estas pruebas.

Etapa 6: modularizacion mobile/planificacion, CLI Prisma fiable y `pnpm check` aprobados localmente. Workflow CI con dos jobs y PostgreSQL temporal creado; YAML parseado sin errores. Primera corrida en GitHub y configuracion de protecciones de rama pendientes de subir los cambios. Los tests React emiten la deprecacion del renderer fijado a 19.2.4; Expo emite advertencias de variables de color del entorno. No son fallos de tests/build ni se ocultan. Limites y futura migracion del renderer documentados en la guia de calidad.

Integracion repetida despues del refactor: 14/14 recorridos aprobados, 0 fallidos/omitidos, aproximadamente 127 segundos de HTTP mas migraciones. Las 34 migraciones se aplicaron desde cero y el runner confirmo la eliminacion de `agro_integration_test_ded9af2bba0543d7be2bd3d3d4c9bc1a`. No se aplicaron migraciones al schema operativo en etapa 6.

Actualizacion de etapa 5: el replay completo detecto incompatibilidad de nombres en migraciones historicas. La nueva migracion `20261001181546_compatibilidad_nombres_replay` permite reproducir el historial sin modificar checksums anteriores. Se verifico que es un no-op en schemas actualizados y se registro en `agro_app` con `db:deploy`, sin migrar datos operativos. Los fixtures de integracion solo se crean en schemas temporales. Se consultaron las credenciales mediante configuracion privada sin imprimirlas; ERP mock y proveedores externos vacios se fuerzan dentro de la suite.

La etapa 1 corrigio la separacion entre nombre visible y clave normalizada de destinos; actualizo README, arquitectura y pautas de calidad. El alcance de las siguientes etapas esta en [PLAN_ACCION_ESTABILIZACION.md](PLAN_ACCION_ESTABILIZACION.md).

La etapa 2 centralizo JWT, valido entradas de autenticacion y mejoro la propagacion y respuesta de errores. Agrego pruebas HTTP reales de auth con dependencias de datos/proveedor sustituidas y pruebas de arranque rechazado con clave invalida. No son pruebas e2e contra PostgreSQL o Microsoft.

En etapa 3 se actualizo el JWT_SECRET local, con autorizacion del usuario y una clave aleatoria valida. Se preservo el material efectivo de cifrado ERP y se verifico cifrado/descifrado local antes y despues; no se imprimieron claves ni se consulto la base. Reiniciar API y volver a autenticar las sesiones previas. `.env` permanece ignorado por Git.

El nucleo offline nuevo se prueba con almacenamiento y servicios sustituidos: aislamiento, concurrencia, errores parciales, logout y reintentos de adjuntos. El recorrido de dispositivo de [MOBILE_TESTING.md](MOBILE_TESTING.md) sigue pendiente: no se dispone de dispositivo/emulador en este entorno. No se declara la etapa cerrada respecto de ese criterio.

Etapa 4: reserva persistente y contexto de escrituras implementados y testeados con dependencias sustituidas. Tras reactivar la base se aprobo la prueba PostgreSQL real: dos clientes independientes, recuperacion, propietario antiguo, rollback, timeout y contencion global. El schema temporal se elimino correctamente y no se modificaron tablas operativas. La suite normal omite ese test sin `ERP_LOCK_TEST_DATABASE_URL`. El usuario aplico la migracion al schema agro_app y db:status confirmo las 33 migraciones actualizadas. Sincronizacion del usuario verificada: corrida 45e3e349-6943-48df-bb8a-0081909c0948 completada, 14 padrones, 20 detalles completados y sin bloqueo restante para su cliente. Integracion activa en modo login. Etapa 4 completada. Ver [ERP_CONCURRENCIA.md](ERP_CONCURRENCIA.md).

## Bloques cubiertos

| Bloque | Estado | Evidencia |
| --- | --- | --- |
| Autenticacion email/Microsoft | Cubierto | Login, registro, identidad Microsoft, JWT, configuracion, arranque invalido y rutas HTTP con errores seguros |
| Roles y middleware | Cubierto | Autenticacion, permisos y errores controlados |
| Auditoria | Cubierto | Servicio, filtros, serializacion y ruta |
| ERP | Cubierto | Cliente, configuracion, mappers, historial y sincronizacion |
| Planificacion agricola | Cubierto | Validaciones, helpers, guardado, cierre, auditoria y snapshot de supuestos |
| Padrones App | Cubierto | Zonas, campos, lotes, especies, actividades, insumos y servicios |
| Protocolos | Cubierto | Fechas, items, costos desde padrones y recalculos |
| Gastos comerciales y precios | Cubierto | Validaciones y preparacion de requests |
| Usuarios admin y asignacion de campos | Cubierto | Alta/edicion, password temporal, asignaciones y auditoria |
| Operativo de campo | Cubierto | Recorridas, observaciones, precipitaciones, ficha de lote y alcance por campo |
| NDVI | Cubierto | Validaciones, mappers, ultimo mapa y alcance por campo |
| Storage y geografia | Cubierto | Adjuntos, KML/KMZ, archivos geograficos y preparacion de guardado |
| Offline sync | Cubierto automaticamente; pendiente dispositivo | Backend: tipos/payloads invalidos. Mobile: propietario, concurrencia, progreso de adjuntos, logout y confirmacion exacta |
| Rutas operativas | Cubierto | Smoke tests de ficha operativa, geografia y NDVI |
| Integracion HTTP/PostgreSQL | Cubierto | 14 recorridos reales de auth, permisos, aislamiento, operativo/offline, recorridas, auditoria, planificacion y ERP mock |
| Migraciones desde cero | Cubierto | 34 migraciones y compatibilidad no-op, con creacion/eliminacion del schema exclusivo |

## Criterio para llamar estable al MVP

Antes de cortar version:

- [x] `pnpm test` completo en verde.
- [x] Rutas criticas con resolvers testeables o smoke tests.
- [x] Servicios criticos con mappers, validaciones y alcance por campo testeados.
- [x] Planificacion cerrada con snapshot economico cubierto por tests.
- [x] Errores de permisos y cliente sin datos cruzados cubiertos por tests.
- [x] Documentacion de tests actualizada.
- [ ] Migraciones aplicadas en el ambiente objetivo.
- [ ] Variables de entorno verificadas en ambiente objetivo.
- [ ] Smoke manual web de login, planificacion, recorridas, observaciones, precipitaciones, ficha de lote y NDVI.
- [ ] Smoke manual mobile/offline con al menos precipitacion y observacion pendiente.

## Riesgos residuales

El estado verde de la suite no implica que los siguientes puntos esten resueltos:

- La clave JWT local ya fue actualizada. Los logins reales y la configuracion del ambiente objetivo siguen pendientes de validacion.
- La cola nueva separa propietarios y serializa mutaciones dentro de un runtime. Quedan pendientes la recuperacion controlada de registros globales anteriores y la coordinacion entre multiples pestanas/procesos web.
- Los adjuntos guardan progreso para reintentos, pero un cierre entre PUT y persistencia local puede repetir una subida; fotos reales, cuotas, reinicio y depuracion de cache requieren validacion en dispositivo.
- Lint/tipos/tests/build ya estan automatizados localmente. Falta ejecutar el workflow hospedado y exigir sus checks en la rama de entrega; no hay CD ni recuperacion de backups probada.

Estos puntos no bloquean el avance de nuevas features, pero conviene tratarlos antes de produccion:

- La suite HTTP/PostgreSQL ya cubre los flujos criticos con fixtures. Falta ampliar cobertura a los restantes endpoints comerciales y servicios externos; no hay prueba UI/e2e de navegador completa.
- El bloqueo ERP persistente ya aprobo la prueba PostgreSQL aislada y su migracion esta aplicada/verificada; la sincronizacion del usuario ya se verifico completada y sin bloqueo restante. Su transaccion acotada incluye lecturas remotas y ocupa una conexion; la cache global serializa refrescos entre clientes. Medir duraciones/pool antes de produccion y evolucionar a descarga/aplicacion separadas si se necesitan jobs largos.
- Mobile offline todavia necesita validacion manual fuerte con dispositivo/emulador y archivos reales.
- La suite de integracion usa middleware y servicios reales; no representa cobertura exhaustiva de todos los endpoints.
- El replay de migraciones y fixtures esta probado en schemas temporales; el seed operativo de administracion y futuras migraciones necesitan verificaciones especificas. La separacion es logica por schema, no una instancia fisica exclusiva.

## Regla para nuevas features

Una nueva feature no deberia entrar si baja este piso:

- suma tests proporcionales al riesgo;
- reutiliza servicios, helpers, tipos y componentes existentes;
- actualiza `docs/CALIDAD_TESTS_MODULARIZACION.md` cuando agrega comportamiento critico;
- mantiene `pnpm test` en verde;
- deja documentado cualquier pendiente manual o tecnico.

