# Entrega, verificaciones y recuperacion

Guia del repositorio, previa al primer lanzamiento. Describe comandos y responsabilidades; no provisiona hosting, backups ni un despliegue automatico. No hay un ambiente productivo validado por esta etapa.

## Herramientas e instalacion

Usar Node `24.18.1` (`.nvmrc`) y pnpm `11.18.0` (`packageManager`/`engines` raiz). Mantener `pnpm-lock.yaml` versionado. Desde la raiz:

```sh
pnpm install --frozen-lockfile
pnpm --filter agro-app-api prisma:generate
pnpm check
pnpm test:integration
```

El ultimo comando exige `TEST_DATABASE_URL` explicita, por entorno o `.env.test.local`, y permiso de crear/eliminar schemas. Nunca usa `DATABASE_URL` como fallback. Ver [PRUEBAS_INTEGRACION.md](PRUEBAS_INTEGRACION.md). Para desarrollo, copiar `.env.example` y completar valores locales antes de generar/ejecutar la API. No guardar credenciales en Git.

| Control | Garantia y limite |
| --- | --- |
| `pnpm lint` | ESLint recomendado para JS/TS, variables sin uso y orden/ubicacion de hooks React. Cero warnings. No analiza tipos ni garantiza comportamiento. |
| `pnpm typecheck` | Compila primero contratos compartidos y verifica los cuatro workspaces con `--noEmit`. |
| `pnpm test` | Compila API/nucleo offline y ejecuta suite rapida. El test PostgreSQL ERP se omite sin su variable explicita. |
| `pnpm build` | Construye tipos, API, web y exportacion Expo. No genera APK/IPA firmado. |
| `pnpm check` | Ejecuta lint, typecheck, tests y build en orden; termina al primer fallo. No incluye integracion PostgreSQL ni pruebas manuales. |
| `pnpm test:integration` | Migra un schema nuevo, carga fixtures, prueba HTTP y elimina ese schema. |

La configuracion de lint vive en `eslint.config.mjs`, con dependencias exactas. Se permite `any` heredado; eliminarlo de todo el proyecto requeriria otro alcance. Se habilita `rules-of-hooks`; no se habilitan `exhaustive-deps` ni reglas que requieren un programa TypeScript. Los directorios generados no se revisan. Las excepciones no sustituyen el chequeo de tipos ni los guards de sesion. Referencias: [ESLint](https://eslint.org/docs/latest/use/configure/configuration-files), [typescript-eslint](https://typescript-eslint.io/getting-started/).

## Integracion continua

`.github/workflows/ci.yml` se ejecuta en PR, push a `main`/`testing` y manualmente. Tiene dos jobs independientes:

1. `calidad`: instalacion con lockfile congelado, generacion Prisma y `pnpm check`.
2. `integracion`: PostgreSQL 16 temporal del runner, generacion Prisma, suite HTTP con 34 migraciones y prueba explicita de exclusion/rollback ERP con dos clientes Prisma.

Ambos usan Node/pnpm del repo y cache del store. Permisos de GitHub solo de lectura, sin credenciales persistidas por checkout. El workflow no necesita secretos de Supabase/ERP/Microsoft, no apunta a bases del usuario ni publica artefactos o despliega. Las claves `postgres/postgres` solo corresponden al contenedor descartable del runner. Nuevas ejecuciones del mismo ref cancelan las anteriores; el contenedor se descarta al terminar el job.

Se usan las versiones mayores documentadas por [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node) y [pnpm/action-setup](https://github.com/pnpm/action-setup). Una actualizacion debe revisar compatibilidad y volver a ejecutar los controles. Este archivo no configura protecciones de rama: para exigirlo al integrar cambios, seleccionar ambos jobs como checks obligatorios en GitHub cuando exista una corrida aprobada.

Estado: configuracion creada y comandos verificados localmente. La corrida hospedada en GitHub queda pendiente de subir los cambios; no se afirma validacion del runner Linux ni del contenedor de CI desde Windows.

## Preparar una entrega

1. Identificar commit, responsable y ambiente; completar los controles anteriores y guardar sus resultados. Ejecutar el smoke web y el recorrido mobile de [MOBILE_TESTING.md](MOBILE_TESTING.md). La parte manual de etapa 3 sigue pendiente.
2. Preparar configuracion del destino desde `.env.example`. API necesita `DATABASE_URL` y `JWT_SECRET` valido; configurar `SECRETS_ENCRYPTION_KEY` independiente para credenciales ERP. Microsoft, Storage y NDVI requieren sus configuraciones especificas. Confirmar cliente/campos asignados con cuentas de testing.
3. Configurar URL de API accesible por clientes. `VITE_*` y `EXPO_PUBLIC_*` son publicas y se incorporan al build; nunca poner secretos ahi. Web lee `.env` raiz; Expo requiere entorno de su launcher o `.env` de mobile. Reconstruir clientes si cambia la URL.
4. Antes de migrar un ambiente con datos, disponer de backup verificable de PostgreSQL y estrategia separada de Storage. Registrar ubicacion/fecha y probar restauracion en base aislada. Este repo no crea ni valida ese backup.
5. Consultar `pnpm --filter agro-app-api db:status`. Revisar SQL pendiente y compatibilidad con la API previa; pausar escrituras si la migracion no es compatible. Ejecutar **una sola instancia** de `pnpm --filter agro-app-api db:deploy` y volver a consultar estado. No usar `db:migrate`, reset o `db:clean:dev` en entregas.
6. Compilar con `pnpm build` y desplegar el mismo conjunto versionado de API, contratos, dependencias y cliente Prisma. Arrancar la API desde la raiz con `node apps/api/dist/index.js` bajo el supervisor del hosting, con variables del ambiente y `PORT`. `apps/web/dist` es el sitio estatico; el hosting debe resolver rutas SPA. `apps/mobile/dist` es exportacion Expo, no una app nativa firmada. No ejecutar `dev` como proceso productivo.
7. Verificar `GET /home` → `200 {"estado":"ok"}`. Solo confirma proceso HTTP; no prueba PostgreSQL ni proveedores. Hacer login y una consulta autenticada de campo/lote, probar persistencia con datos controlados, abrir una foto y verificar aislamiento entre dos usuarios/clientes. Para ERP, comprobar historial y ausencia de reserva pendiente segun [ERP_CONCURRENCIA.md](ERP_CONCURRENCIA.md).
8. Registrar version/ambiente, migraciones, smoke tests, responsable y pendientes en la evidencia de entrega. No declarar estable una version con controles requeridos sin ejecutar.

Antes del primer lanzamiento quedan por definir hosting, TLS/dominios, supervisor, backups, observabilidad y distribucion/firma mobile. El workflow actual es CI, no CD.

## Recuperacion

| Falla | Accion |
| --- | --- |
| API no arranca | Revisar variables y logs privados; JWT ausente/corto falla antes de escuchar. `db:status` usa `.env` raiz o entorno. Un valor del proceso, incluso vacio, tiene prioridad. No pegar secretos en reportes. |
| Deploy o migracion falla | Detener el avance y conservar salida/estado. No marcar una migracion como aplicada sin comprobar efectos ni editar SQL ya aplicado. Resolver con una migracion correctiva revisada o restauracion probada en base aislada; Prisma deploy no ofrece rollback automatico. |
| Regresion de aplicacion | Volver al artefacto/commit anterior solo si es compatible con el schema vigente y contratos de clientes instalados. Conservar backup; no borrar datos para volver a arrancar. |
| Base pausada/no accesible | Reactivar/verificar conectividad y credenciales del destino. Confirmar estado de migraciones y repetir smoke. El `GET /home` verde no acredita acceso a datos. |
| Credenciales ERP ilegibles | Recuperar la misma clave de cifrado con que se guardaron. Rotar JWT invalida sesiones; cambiar la clave efectiva de cifrado requiere proceso de recifrado. Ver [AUTENTICACION.md](AUTENTICACION.md). |
| Sincronizacion ERP interrumpida | Consultar historial/reserva; esperar vencimiento y reintentar por el coordinador normal. No borrar reservas activas manualmente. Ver [ERP_CONCURRENCIA.md](ERP_CONCURRENCIA.md). |
| Pendientes mobile/fotos fallan | Conservar almacenamiento y cuenta propietaria, corregir permisos/red/configuracion y reintentar. No reinstalar ni limpiar cache como primera medida. Registros legacy sin propietario requieren recuperacion controlada; no atribuirlos a otra cuenta. Ver [OFFLINE.md](OFFLINE.md). |
| Integracion interrumpida | El runner intenta limpiar su schema. Ante corte forzado, verificar el prefijo/ID exactos antes de limpiar manualmente; nunca apuntar a `agro_app` o `public`. Ver guia de integracion. |

El wrapper `scripts/prisma-with-root-env.js` usa el CLI instalado del workspace mediante Node, sin shell; propaga codigos no cero y considera error una terminacion sin codigo o un fallo de inicio. `tests/prisma-cli.test.js` verifica estos casos y prioridad del entorno sin conectarse a una base. No se modificaron migraciones ni secretos por la etapa 6.
