# Estabilidad MVP

Fecha de corte: 2026-11-06 (etapas 1 a 4; pendientes dispositivo en etapa 3 y migracion/prueba PostgreSQL en etapa 4).

Este documento resume el estado tecnico para dejar una version estable antes de seguir con nuevas features.

## Estado actual

- Suite automatica completa: `pnpm test`.
- Resultado ultimo: 270 tests, 269 passing, 0 failing, 1 skipped (PostgreSQL opcional).
- Archivos de test: 46.
- Build API incluido en la suite: `pnpm --filter agro-app-api build`.
- Catalogo de tests documentado en `docs/CALIDAD_TESTS_MODULARIZACION.md`.

Verificaciones ejecutadas el 2026-11-06 con Node `v24.18.1` y pnpm `11.18.0` (versiones observadas en este entorno, no fijadas por el repositorio):

| Comando | Resultado | Alcance |
| --- | --- | --- |
| `pnpm test` | Correcto: 269 aprobados, 1 omitido, etapa 4 | Compila tipos/API/nucleo offline y ejecuta 46 archivos de pruebas |
| `pnpm build` | Correcto, etapa 4 | Tipos, API, web Vite y exportacion Expo para web, iOS y Android |
| `pnpm --filter agro-app-mobile exec tsc --noEmit` | Correcto, etapa 3 | Chequeo TypeScript mobile, separado del bundle Expo |
| `pnpm --filter agro-app-api prisma:validate` | Schema valido, etapa 4 | Modelo de reserva ERP; no aplica migraciones ni verifica conectividad |
| `pnpm --filter agro-app-api prisma:generate` | Correcto, etapa 4 | Prisma Client regenerado con el modelo nuevo |

Los comandos que crean subprocesos se ejecutaron fuera del sandbox debido a su restriccion `spawn EPERM`. No se cambiaron dependencias ni se aplicaron migraciones/seeds. No se validaron conexiones reales con PostgreSQL, ERP, Microsoft o Supabase ni flujos en dispositivo. La guia de inicio se reviso contra scripts y configuracion existentes, sin repetir una instalacion limpia.

La etapa 1 corrigio la separacion entre nombre visible y clave normalizada de destinos; actualizo README, arquitectura y pautas de calidad. El alcance de las siguientes etapas esta en [PLAN_ACCION_ESTABILIZACION.md](PLAN_ACCION_ESTABILIZACION.md).

La etapa 2 centralizo JWT, valido entradas de autenticacion y mejoro la propagacion y respuesta de errores. Agrego pruebas HTTP reales de auth con dependencias de datos/proveedor sustituidas y pruebas de arranque rechazado con clave invalida. No son pruebas e2e contra PostgreSQL o Microsoft.

En etapa 3 se actualizo el JWT_SECRET local, con autorizacion del usuario y una clave aleatoria valida. Se preservo el material efectivo de cifrado ERP y se verifico cifrado/descifrado local antes y despues; no se imprimieron claves ni se consulto la base. Reiniciar API y volver a autenticar las sesiones previas. `.env` permanece ignorado por Git.

El nucleo offline nuevo se prueba con almacenamiento y servicios sustituidos: aislamiento, concurrencia, errores parciales, logout y reintentos de adjuntos. El recorrido de dispositivo de [MOBILE_TESTING.md](MOBILE_TESTING.md) sigue pendiente: no se dispone de dispositivo/emulador en este entorno. No se declara la etapa cerrada respecto de ese criterio.

Etapa 4: reserva persistente y contexto de escrituras implementados y testeados con dependencias sustituidas. La prueba PostgreSQL real se intento en un schema temporal aislado, pero no pudo conectar con la base configurada: fallo antes de crear el schema y no modifico datos. La suite normal omite ese test sin `ERP_LOCK_TEST_DATABASE_URL`. La migracion nueva no se aplico al entorno de aplicacion; la sincronizacion requiere aplicarla cuando la base vuelva a estar disponible. Ver [ERP_CONCURRENCIA.md](ERP_CONCURRENCIA.md).

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

- La suite actual es mayormente de unidad/servicio; falta una capa e2e real contra API levantada y base de testing.
- El bloqueo ERP persistente requiere aplicar su migracion y aprobar la prueba PostgreSQL real. Su transaccion acotada incluye lecturas remotas y ocupa una conexion; la cache global serializa refrescos entre clientes. Medir duraciones/pool antes de produccion y evolucionar a descarga/aplicacion separadas si se necesitan jobs largos.
- Mobile offline todavia necesita validacion manual fuerte con dispositivo/emulador y archivos reales.
- Las rutas tienen smoke tests de delegacion; falta cobertura HTTP completa con middleware real para todos los endpoints.
- Las migraciones y seeds deben validarse en un schema separado de testing antes del despliegue.

## Regla para nuevas features

Una nueva feature no deberia entrar si baja este piso:

- suma tests proporcionales al riesgo;
- reutiliza servicios, helpers, tipos y componentes existentes;
- actualiza `docs/CALIDAD_TESTS_MODULARIZACION.md` cuando agrega comportamiento critico;
- mantiene `pnpm test` en verde;
- deja documentado cualquier pendiente manual o tecnico.

