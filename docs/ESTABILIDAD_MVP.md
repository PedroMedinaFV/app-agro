# Estabilidad MVP

Fecha de corte: 2026-11-06 (etapas 1 a 5; integracion HTTP/PostgreSQL aprobada; pendiente recorrido de dispositivo de etapa 3).

Este documento resume el estado tecnico para dejar una version estable antes de seguir con nuevas features.

## Estado actual

- Suite rapida: `pnpm test`; 274 tests, 273 aprobados, 0 fallidos, 1 omitido (PostgreSQL ERP opcional).
- Archivos de suite rapida: 48.
- Suite de integracion: `pnpm test:integration`; 14 aprobados, 0 fallidos, 0 omitidos, en un archivo HTTP separado.
- Replay de las 34 migraciones en schema vacio y limpieza final aprobados; fixtures ficticios.
- Build API incluido en la suite: `pnpm --filter agro-app-api build`.
- Catalogo de tests documentado en `docs/CALIDAD_TESTS_MODULARIZACION.md`.

Verificaciones ejecutadas el 2026-11-06 con Node `v24.18.1` y pnpm `11.18.0` (versiones observadas en este entorno, no fijadas por el repositorio):

| Comando | Resultado | Alcance |
| --- | --- | --- |
| `pnpm test` | Correcto: 273 aprobados, 1 omitido, etapa 5 | Compila tipos/API/nucleo offline y ejecuta 48 archivos de pruebas |
| `pnpm test:integration` | Correcto: 14 aprobados, 0 omitidos, etapa 5 | App Express real, 34 migraciones, fixtures, HTTP/PostgreSQL y eliminacion del schema; tests HTTP de la ultima corrida: aproximadamente 131 segundos |
| `pnpm build` | Correcto, etapa 5 | Tipos, API, web Vite y exportacion Expo para web, iOS y Android |
| `pnpm --filter agro-app-mobile exec tsc --noEmit` | Correcto, etapa 3 | Chequeo TypeScript mobile, separado del bundle Expo |
| `pnpm --filter agro-app-api prisma:validate` | Schema valido, etapa 4 | Modelo de reserva ERP; no aplica migraciones ni verifica conectividad |
| `pnpm --filter agro-app-api prisma:generate` | Correcto, etapa 4 | Prisma Client regenerado con el modelo nuevo |
| `pnpm --filter agro-app-api db:status` | Base actualizada, 34 migraciones, etapa 5 | Consulta real al schema `agro_app` despues de registrar compatibilidad; sin escrituras |
| `node --test tests/erp-bloqueo-postgres.test.js` con `ERP_LOCK_TEST_DATABASE_URL` | 1 aprobado, 0 fallidos, 0 omitidos | PostgreSQL real, schema temporal creado y eliminado; aproximadamente 29 segundos |

Los comandos que crean subprocesos se ejecutaron fuera del sandbox debido a su restriccion `spawn EPERM`. No se cambiaron dependencias. PostgreSQL y HTTP se verificaron con fixtures ficticios en schemas aislados; en agro_app solo se registro la compatibilidad no-op de etapa 5, sin cambios en datos de negocio. La suite usa ERP mock; la corrida del usuario con integracion real se registro por separado en etapa 4. Microsoft/Storage reales y dispositivo siguen fuera de estas pruebas.

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
- El script raiz `lint` aun no tiene implementacion en los workspaces; pendiente de automatizacion en etapa 6.

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

