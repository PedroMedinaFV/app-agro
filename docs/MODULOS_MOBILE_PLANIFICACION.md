# Modulos mobile y planificacion

Etapa 6 del plan de estabilizacion. Esta guia permite ubicar donde cambiar una pantalla, una regla o una escritura sin volver a concentrar responsabilidades.

## Mobile: entrada, sesion y operaciones

`apps/mobile/src/App.tsx` es la entrada activa. Compone login o panel operativo. Los archivos de navegacion/store anteriores no se conectan automaticamente a este flujo.

| Modulo en `apps/mobile/src` | Responsabilidad y dependencias |
| --- | --- |
| `hooks/useSesionMobile.ts` | Credenciales, login por email, sesion y referencia compartida de sesion vigente. Usa el adaptador HTTP existente. |
| `screens/PantallaLogin.tsx` | Presenta entradas y acciones de login recibidas por props. El boton Microsoft preexistente sigue sin handler implementado; no implica soporte Microsoft nativo. |
| `screens/PantallaOperativa.tsx` | Compone consulta, formularios y acciones; no implementa persistencia ni transporte. |
| `hooks/useDatosOperativosMobile.ts` | Carga snapshot/ficha, selecciona campo/lote y deriva valores para consulta. Cancela actualizaciones de respuestas anteriores al cambiar seleccion/sesion. |
| `hooks/usePendientesMobile.ts` | Lee contador/aviso legacy y presenta progreso/resultado de sincronizacion. Delega exclusiones y confirmaciones al nucleo offline existente. |
| `hooks/useFormularioRegistrosMobile.ts` | Valida entradas, preserva fotos y guarda registros en la cola del propietario antes de sincronizar. Limpia el formulario solo despues de persistir. |
| `hooks/useFotoObservacion.ts` | Permisos y selector/camara de Expo; descarta resultados de una sesion anterior. |
| `data/planificacionVacia.ts`, `styles/mobile.ts` | Snapshot inicial y presentacion reutilizados, sin reglas de negocio. |
| `services/offline/*` | Contratos, cola y coordinador independientes de React/Expo. Su operacion esta en [OFFLINE.md](OFFLINE.md). |

Al cambiar sesion se actualiza primero la referencia compartida y se incrementa una version numerica. `App` usa esa version como `key` del panel: React desmonta formularios, fotos, selecciones y datos de la cuenta anterior. La clave no contiene el token. Las tareas asincronas capturan la sesion original y solo actualizan la interfaz si sigue vigente; solicitudes iniciadas pueden terminar y confirmar exclusivamente la cola original. No se borran pendientes al salir.

La lectura de pendientes y la carga del snapshot son independientes. Una falla de almacenamiento muestra un aviso y no impide consultar datos operativos; tampoco autoriza enviar un registro que no se pudo guardar. No se agrega login offline, cache persistente del snapshot ni recuperacion automatica de registros legacy.

Para ampliar el panel, agregar el comportamiento al hook de su responsabilidad y componer su resultado en la pantalla. Las reglas de reintentos/propietario pertenecen al nucleo offline, no a los componentes. Los hooks dependen de los adaptadores actuales; no se introduce un contenedor global ni una jerarquia de clases.

## API: planificacion

Se conserva la API publica de `services/planificacion/planificacionesPrisma.ts`. Los callers y rutas siguen usando sus funciones existentes.

| Modulo en `apps/api/src/services/planificacion` | Contrato |
| --- | --- |
| `planificacionesPrisma.ts` | Coordina lectura/guardado/cierre, alcance de sesion, referencias, validaciones, transaccion y auditoria. Sigue siendo el limite del caso de uso. |
| `serializacionPlanificacion.ts` | Transforma filas Prisma/JSON a contratos `@agro/tipos` y snapshots a valores JSON de persistencia. No consulta base ni abre transacciones. |
| `lineasPlanificacionPrisma.ts` | `reemplazarLineas(tx, planificacion)` recalcula lineas, elimina las anteriores y escribe bloques de hasta 250 en la transaccion recibida. No crea cliente global ni hace commit propio. |
| `validacionesPlanificacion.ts`, `alcancePlanificacion.ts` | Reglas y permisos compartidos ya existentes. |

El reemplazo de lineas debe invocarse dentro de la misma transaccion que cabecera y auditoria. Si falla un bloque, se revierte el conjunto; nunca llamar a este helper con escrituras desconectadas. Los importes, snapshots, filtros por cliente y tiempos transaccionales se conservan. No hay cambios de endpoints, contratos ni schema/migraciones en esta etapa.

Esta separacion aplica responsabilidad unica y permite reutilizar las conversiones y la persistencia transaccional. No implica que todos los servicios del repositorio ya esten modularizados; futuras extracciones deben responder a una responsabilidad concreta.

## Verificacion y limites

- `pnpm typecheck`: contratos y todas las pantallas/hooks, ademas de API/web/tipos.
- `pnpm test`: reglas, guardado/cierre/snapshots, permisos, nucleo offline, ciclo de hooks y CLI Prisma.
- `pnpm test:integration`: mismos casos de uso de planificacion por HTTP contra PostgreSQL, con snapshots y cierre; no solo mocks del mapper.
- `pnpm build`: compilacion API/web y exportacion Expo de las plataformas configuradas.
- [MOBILE_TESTING.md](MOBILE_TESTING.md): recorrido manual obligatorio de dispositivo, incluyendo cambio de cuenta, respuestas en vuelo, reinicio y fotos reales. Sigue pendiente; los tests de React sustituyen adaptadores nativos/red y no prueban permisos ni archivos.

Las herramientas, CI y entrega se describen en [ENTREGA_Y_RECUPERACION.md](ENTREGA_Y_RECUPERACION.md). Los resultados de cada ejecucion se registran en [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md).
