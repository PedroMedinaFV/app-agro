# Pruebas de integracion HTTP y PostgreSQL

Fecha: 2026-11-06. Etapa 5 del plan de estabilizacion.

Ampliacion de identidad App/ERP: la suite incorpora consolidacion/rollback de siete padrones, notificaciones vigentes/obsoletas, aliases para IDs anteriores, aislamiento y ciclos de materializacion/vinculacion. El replay vigente incluye 35 migraciones; [IDENTIDAD_PADRONES_ERP.md](IDENTIDAD_PADRONES_ERP.md) explica la migracion nueva, el preflight y la activacion operativa pendiente.

Para diagnosticar un escenario tras compilar API con el mismo runner aislado: `node scripts/run-integration-tests.js "--test-name-pattern=aceptar sugerencia"`. El filtro se pasa al runner nativo de Node; sigue creando/migrando/eliminando un schema temporal y los casos restantes se omiten. Esa corrida no sustituye una suite completa aprobada. Solo se admite ese argumento opcional; en CI se rechaza cualquier filtro. El comando habitual `pnpm test:integration` ejecuta todos los casos.

Etapa 6: `.github/workflows/ci.yml` ejecuta esta suite contra PostgreSQL 16 temporal y tambien el test explicito de bloqueo ERP. No necesita la configuracion privada local ni secretos de proveedores. La primera corrida en GitHub queda pendiente de subir los cambios; operacion y controles en [ENTREGA_Y_RECUPERACION.md](ENTREGA_Y_RECUPERACION.md).

## Objetivo y alcance

Probar la aplicacion Express real con autenticacion, permisos, validaciones, servicios, Prisma, auditoria y PostgreSQL. Se usan usuarios y datos ficticios en un schema exclusivo por ejecucion. No se sustituyen los servicios de negocio ni la base con mocks.

Se separan dos comandos:

- `pnpm test`: suite rapida de unidad/servicios, tests HTTP de autenticacion con dependencias sustituidas y la prueba PostgreSQL ERP opcional existente.
- `pnpm test:integration`: construye la API, crea el entorno aislado, aplica todas las migraciones desde cero y ejecuta `tests/integration/api.integration.test.js` contra HTTP y PostgreSQL reales.

La integracion ERP de esta suite usa el proveedor `mock` existente; permisos, coordinador, historial, bloqueo y persistencia son reales. No llama al ERP, Microsoft ni Supabase Storage externos. Las pruebas con proveedor real de etapa 4 y los recorridos de dispositivo de etapa 3 son evidencia distinta.

## Configuracion explicita

Se necesita Node/pnpm del proyecto, dependencias instaladas, Prisma Client generado y acceso PostgreSQL con permisos de crear y eliminar schemas. Configurar `TEST_DATABASE_URL` en el entorno o en `.env.test.local` en la raiz:

```dotenv
TEST_DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST:5432/BASE"
```

El archivo local esta ignorado por Git. No copiar credenciales a documentos, scripts versionados ni salidas de terminal. Las variables del proceso prevalecen sobre ese archivo, incluso si son vacias. Una configuracion vacia falla explicitamente; el runner no toma `DATABASE_URL` como fallback.

Para esta implementacion se preparo la configuracion privada local usando el servidor PostgreSQL de desarrollo disponible. No se cambia la conexion operativa del proyecto. En CI o un entorno compartido se recomienda una base y rol propios para testing, suministrados mediante `TEST_DATABASE_URL`.

La separacion actual es por schema dentro del servidor configurado, no exige una instancia PostgreSQL distinta. Por eso se puede probar en Supabase sin privilegios de `CREATE DATABASE`, conservando separadas las tablas y fixtures. No se debe afirmar aislamiento de recursos, conexiones o rendimiento entre bases fisicas.

## Ciclo de ejecucion e integridad

1. `scripts/lib/integration-environment.js` carga exclusivamente la configuracion explicita de testing.
2. El runner genera un nombre nuevo `agro_integration_test_<32 caracteres hexadecimales>`. Ese formato se valida antes de crear o eliminar.
3. Un cliente administrador crea solo ese schema. La URL para migraciones/API se reconstruye forzando el parametro `schema`; no se conserva el schema operativo de la conexion de entrada.
4. Se generan claves JWT y de cifrado temporales. Se fuerza `NODE_ENV=test`, ERP mock y variables de proveedores externos vacias. No se reutiliza el JWT de desarrollo.
5. Se ejecuta `prisma migrate deploy` contra ese schema vacio utilizando los archivos reales de migracion del repositorio. Un fallo cancela las siguientes fases y devuelve codigo de error.
6. Un proceso separado ejecuta las pruebas HTTP en orden. Antes de importar Prisma/app exige schema valido y entorno test; antes de crear fixtures consulta `current_schema()` y comprueba que coincide con el generado.
7. La API usa `crearApp()` desde `apps/api/src/app.ts`, los mismos routers y middleware que desarrollo, en `127.0.0.1` y puerto efimero. `index.ts` conserva exclusivamente el arranque del servidor normal.
8. Al terminar, se cierra el servidor y Prisma. El runner elimina con `DROP SCHEMA ... CASCADE` solo el nombre que genero y cuya creacion confirmo, tambien ante tests/migraciones fallidos.

La URL base no se usa para migrar tablas operativas. No se ejecuta `db:seed`, limpiezas de desarrollo ni `migrate reset` sobre `agro_app`. Si la conexion se pierde durante la limpieza o se mata el proceso abruptamente, puede quedar un schema temporal: la salida muestra su nombre para recuperacion controlada. No se implementa un barrido que borre schemas por prefijo.

### Bloqueo global de Prisma durante el replay

Un intento encontro P1002 al adquirir el advisory lock global de Prisma en el pooler. Cada replay ya tiene un schema nuevo y exclusivo; no hay dos migradores sobre sus tablas. El runner define `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` solo para ese subproceso de migraciones. Se verifico que el motor Prisma instalado soporta esa variable.

La excepcion no se exporta al proceso del usuario ni modifica `db:deploy`. Las migraciones de la aplicacion mantienen su bloqueo normal. Los bloqueos de negocio ERP tambien se mantienen en las pruebas. No usar esta excepcion para ejecutar dos despliegues sobre un mismo schema.

## Migracion de compatibilidad para instalaciones nuevas

El primer replay detecto que `20261001181547_` esperaba nombres de constraints/indices distintos a los que dejaban migraciones anteriores. Algunas consultaban `pg_constraint` sin filtrar por schema: un nombre homonimo de `agro_app` podia impedir renombrar el objeto del schema nuevo.

Se agrega `20261001181546_compatibilidad_nombres_replay`, que se ordena antes del paso afectado. No se editan archivos/checksums de migraciones ya aplicadas:

- En instalaciones nuevas prepara los nombres que espera la siguiente migracion, consultando y modificando exclusivamente los objetos del schema actual.
- Si `20261001181547_` ya figura aplicada, retorna sin modificar datos, nombres o indices. Esto permite registrar la compatibilidad en bases existentes sin deshacer su normalizacion.
- La suite prueba tanto replay completo como ejecucion no-op sobre un schema ya actualizado, comparando constraints e indices antes/despues.

El repositorio tiene ahora 34 migraciones. La compatibilidad se registro tambien en `agro_app` con el `db:deploy` habitual, sin excepcion de advisory lock, despues de comprobar que era la unica pendiente y que no modifica un schema actualizado. En otros entornos debe registrarse por el mismo flujo; que su nombre sea anterior no significa que ya este aplicada. Usar `db:status` para consultar pendientes, sin ejecutar Prisma directamente sin el cargador del `.env` raiz.

## Datos y escenarios

`tests/integration/fixtures.js` crea dos clientes, dos administradores, dos operadores con campos asignados, un operador sin campos, tres campos, tres lotes y actividades. Las contrasenas son ficticias y se guardan con bcrypt real. Las sesiones se obtienen mediante `/auth/login`, no fabricando claims para saltear el flujo.

| Recorrido | Comprobacion |
| --- | --- |
| Migraciones y login | Todos los directorios de migracion figuran aplicados; credenciales reales; hash no expuesto |
| Compatibilidad | Reejecutar el SQL nuevo en schema actualizado no modifica constraints/indices |
| Middleware HTTP | JWT ausente/invalido, JSON malformado y rol sin permiso rechazados por la app real |
| Registro publico | Campos `rol` y `clienteId` del body no conceden privilegios; sesion sin cliente no puede elegirlo por querystring |
| Precipitacion | Persistencia, usuario/cliente derivados del JWT y auditoria real |
| Alcance de campos | Rechazar otro cliente, campo no asignado y lote de otro campo sin crear registros |
| Lecturas y ficha | Recortar por cliente/campos y denegar ficha ajena; usuario sin asignaciones no recibe datos |
| Offline parcial | Observacion y precipitacion confirmadas, registro ajeno pendiente; reintentos sin duplicar datos/auditoria |
| Offline concurrente | Dos envios del mismo ID dejan un unico registro; un reintento confirma el resultado |
| Recorridas | Crear, adjuntar observacion, consultar y cerrar con auditoria; rechazar cierre invalido o duplicado |
| Auditoria/usuarios | Querystring no cambia el cliente; un admin no recibe usuarios/eventos del otro |
| Administracion | GET/PUT/POST de integracion, empresas y asignaciones rechazan rutas de otro cliente |
| Planificacion | Guardar, rechazar cliente/ID/referencias ajenos, cerrar con snapshots/economia y bloquear edicion posterior |
| ERP | Proveedor mock con HTTP, permiso, bloqueo, historial y liberacion PostgreSQL reales |

Los tests son secuenciales y comparten solo los fixtures de su schema efimero. Los nombres de los casos describen el comportamiento protegido; los helpers de HTTP y fixtures separan transporte, preparacion y aserciones.

## Correcciones de producto verificadas por esta etapa

- `services/seguridad/alcanceCliente.ts` centraliza cliente obligatorio y rechazo de otro cliente; `middleware/cliente.ts` lo aplica a las tres rutas administrativas parametrizadas. Ser admin no concede acceso entre tenants.
- Planificacion toma el cliente de la sesion, sin fallback a querystring. Guardado/cierre comparan sesion, body y propietario persistido; cambiar el ID o el cliente del body no permite modificar una planificacion ajena.
- `alcancePlanificacion.ts` valida referencias de campo, empresa, lote, actividad y protocolo antes de escribir lineas. Hace consultas agrupadas y usa mapas/sets para evitar busquedas cuadraticas en planillas grandes.
- Cierre de recorrida exige `origen` valido antes de escribir o auditar. Un body incompleto recibe 400 en lugar de fallar al crear auditoria.
- Cierre de planificacion reutiliza el timeout acotado de 60 segundos del guardado, con maxWait de 10 segundos; el limite implicito de 5 segundos fallaba en PostgreSQL remoto aun con una linea. Se conserva la transaccion y su rollback.

Estas correcciones mantienen contratos existentes; endurecen autorizacion y validan campos que ya eran obligatorios. No se crean roles globales ni permisos para elegir otro cliente. La capacidad del cierre con planificaciones grandes requiere mediciones adicionales; aumentar timeout no sustituye optimizar consultas.

## Uso y diagnostico

```powershell
pnpm test
pnpm test:integration
pnpm build
```

Si falta configuracion, no hay conexion o los permisos son insuficientes, `test:integration` falla; no informa un skip como si la integracion estuviera aprobada. La suite rapida sigue disponible sin acceso PostgreSQL.

Para P3018 revisar el nombre/error de migracion impreso por el subproceso. No resolver como aplicada una migracion fallida para ocultar el error: el entorno temporal se descarta y el siguiente intento reproduce todo. Para una asercion HTTP, revisar status/body y el escenario ficticio correspondiente. Una salida de limpieza correcta confirma que ese schema fue eliminado.

La evidencia final y los comandos ejecutados se registran en [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md). Quedan fuera de esta suite: UI navegador, fotos/camara/archivos del dispositivo, Microsoft y Storage reales, pruebas de carga, recuperacion ante caidas de PostgreSQL y cobertura de todos los endpoints comerciales. No reemplaza los pendientes manuales de la etapa 3 ni la automatizacion de entrega de la etapa 6.
