# Estabilidad MVP

Fecha de corte: 2026-11-06 (etapa 1 del plan de estabilizacion).

Este documento resume el estado tecnico para dejar una version estable antes de seguir con nuevas features.

## Estado actual

- Suite automatica completa: `pnpm test`.
- Resultado ultimo: 229 tests, 229 passing, 0 failing.
- Archivos de test: 37.
- Build API incluido en la suite: `pnpm --filter agro-app-api build`.
- Catalogo de tests documentado en `docs/CALIDAD_TESTS_MODULARIZACION.md`.

Verificaciones ejecutadas el 2026-11-06 con Node `v24.18.1` y pnpm `11.18.0` (versiones observadas en este entorno, no fijadas por el repositorio):

| Comando | Resultado | Alcance |
| --- | --- | --- |
| `pnpm test` | Correcto: 229/229 | Compila tipos/API y ejecuta 37 archivos de pruebas |
| `pnpm build` | Correcto | Tipos, API, web Vite y exportacion Expo para web, iOS y Android |
| `pnpm --filter agro-app-mobile exec tsc --noEmit` | Correcto | Chequeo TypeScript mobile, separado del bundle Expo |
| `pnpm --filter agro-app-api prisma:validate` | Schema valido | No aplica migraciones ni verifica conectividad con la base |

Los comandos que crean subprocesos se ejecutaron fuera del sandbox debido a su restriccion `spawn EPERM`. No se cambiaron dependencias ni se aplicaron migraciones/seeds. No se validaron conexiones reales con PostgreSQL, ERP, Microsoft o Supabase ni flujos en dispositivo. La guia de inicio se reviso contra scripts y configuracion existentes, sin repetir una instalacion limpia.

La etapa 1 corrigio la separacion entre nombre visible y clave normalizada de destinos; actualizo README, arquitectura y pautas de calidad. El alcance de las siguientes etapas esta en [PLAN_ACCION_ESTABILIZACION.md](PLAN_ACCION_ESTABILIZACION.md).

## Bloques cubiertos

| Bloque | Estado | Evidencia |
| --- | --- | --- |
| Autenticacion email/Microsoft | Cubierto | Login, registro, identidad Microsoft, JWT y permisos |
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
| Offline sync | Cubierto | Tipos no soportados y payload invalido sin marcar como sincronizado |
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

- JWT permite todavia el fallback `secret-dev` si no se configura `JWT_SECRET`; la etapa 2 lo elimina y mejora validaciones y errores de autenticacion.
- La cola offline usa una clave local global y escritura del arreglo completo; la etapa 3 aborda aislamiento por usuario/cliente y concurrencia.
- Los reintentos de adjuntos offline requieren persistir su progreso para evitar subidas repetidas; pendiente de etapa 3.
- El script raiz `lint` aun no tiene implementacion en los workspaces; pendiente de automatizacion en etapa 6.

Estos puntos no bloquean el avance de nuevas features, pero conviene tratarlos antes de produccion:

- La suite actual es mayormente de unidad/servicio; falta una capa e2e real contra API levantada y base de testing.
- La sincronizacion ERP usa lock en memoria para MVP temprano; para produccion conviene lock persistente por cliente.
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

