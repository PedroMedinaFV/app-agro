# Registros offline y reintentos

Actualizado: 2026-11-06, etapa 3 de estabilizacion. Implementacion y pruebas automaticas disponibles; validacion con fotos reales en dispositivo pendiente.

Etapa 6: la entrada y los hooks de sesion, datos, formularios, fotos y pendientes se separaron sin cambiar el formato de cola ni el coordinador. Ver [MODULOS_MOBILE_PLANIFICACION.md](MODULOS_MOBILE_PLANIFICACION.md) para contratos y ciclo de desmontaje del panel. `tests/mobile-react.test.js` prueba cambios de cuenta, respuestas/fotos anteriores y fallos de persistencia con React real y adaptadores sustituidos; no reemplaza el recorrido de dispositivo.

## Proposito y alcance

El operador puede guardar observaciones y precipitaciones cuando la API no esta disponible. Los registros permanecen en el dispositivo y solo se envian con la sesion de su propietario. El backend mantiene la autoridad sobre permisos, cliente, campos y lotes.

La pantalla activa de mobile guarda siempre primero en almacenamiento persistente, incluso con conexion. Usa el mismo ID local en todos los reintentos; asi una respuesta perdida no se convierte en un nuevo alta desde la pantalla. No se implementa en esta etapa login offline, cache persistente de padrones, sincronizacion en segundo plano ni edicion de pendientes.

## Flujo funcional

1. Iniciar sesion con un usuario asociado a un cliente y cargar los campos/lotes accesibles.
2. Completar la observacion o precipitacion. Las fotos se preservan antes de confirmar el guardado local.
3. Guardar un pendiente con ID estable en la cola del cliente/usuario. Si falla el almacenamiento, informar el error y conservar el formulario; no afirmar que fue guardado ni enviarlo a la API.
4. Limpiar el formulario solo despues de persistir y si sigue activa la misma sesion.
5. Intentar sincronizar. El boton `Sincronizar pendientes` permite reintentar; los errores conservan el registro.
6. Mostrar la cantidad real de pendientes de esa sesion, sin confiar en los contadores devueltos por el servidor.

Al cerrar sesion se limpian formularios, fotos seleccionadas, snapshot y contadores de pantalla. La cola queda conservada para cuando vuelva a ingresar su propietario. Las respuestas antiguas de carga de datos o del picker no deben actualizar la pantalla de otra sesion.

## Almacenamiento e identidad

`PropietarioOffline` contiene `clienteId` y `usuarioId`, ambos obligatorios. La clave es `agro-app-registros-v2:<cliente codificado>:<usuario codificado>`; los segmentos se codifican para evitar colisiones por separadores.

Cada valor contiene `{ version: 2, registros: [...] }`. Cada registro guarda:

| Campo | Uso |
| --- | --- |
| `id` | Identificador generado una sola vez antes del primer envio |
| `propietario` | Cliente y usuario que originaron la carga; asignados por la cola |
| `tipo` | `observacion` o `precipitacion` en la pantalla actual |
| `payload` | Datos de negocio; no incluye el token de sesion |
| `creadoEn` | Fecha local de creacion |
| `sincronizado` | Solo cambia a verdadero tras confirmacion exacta del servidor |
| `adjuntosLocales` | URI persistida y metadata de cada foto; `subido` conserva metadata remota tras un PUT exitoso |

Se utiliza AsyncStorage en React Native y localStorage en la exportacion web. Si no hay almacenamiento, se propaga un error; no existe fallback silencioso a memoria. Un JSON corrupto, formato incompatible, ID duplicado o propietario ajeno impide sobrescribir la cola y requiere recuperacion.

Las operaciones de lectura/modificacion/escritura estan serializadas por adaptador y propietario. Incluyen altas, confirmaciones, progreso de fotos y limpieza de sincronizados; distintas instancias de cola sobre el mismo adaptador comparten esa exclusion. Un fallo no bloquea las operaciones siguientes.

El bloqueo cubre un mismo runtime JavaScript, como la app nativa. No proporciona exclusion entre multiples pestanas/procesos web escribiendo a la vez en localStorage; para ese uso se necesita un coordinador entre contextos o una base transaccional. El almacenamiento local tampoco esta cifrado por esta etapa.

## Registros anteriores

La antigua clave `agro-app-registros-local` no contiene un propietario verificable. No se importa a la sesion que ingresa, no se sincroniza ni se borra automaticamente. La pantalla avisa si hay registros anteriores pendientes o ilegibles.

Su recuperacion debe identificar al propietario y revisar campos/lotes antes de reasignar datos de forma controlada. Esta etapa no publica una herramienta de recuperacion ni expone esos payloads a otro usuario. La ausencia de migracion automatica evita atribuir cargas de A a B.

## Sincronizacion y adjuntos

`sincronizarCola` toma una lista inicial de pendientes y procesa cada registro por separado. Un error de un registro permite continuar con otros; las altas locales que ocurren durante el envio no se eliminan y quedan para la proxima pasada. Dos sincronizaciones simultaneas de la misma cola se rechazan, sin duplicar solicitudes.

Para cada foto sin `subido`:

1. Pedir firma a `POST /observaciones/adjuntos/upload-url` con el token capturado de la sesion.
2. Subir el contenido mediante PUT a la URL firmada.
3. Persistir inmediatamente en esa cola el bucket/path y metadata confirmada, antes de pasar a otra foto o enviar el registro. No se guarda la URL firmada ni el token.

Si una segunda foto falla o se pierde la respuesta del registro, el siguiente intento reutiliza los adjuntos cuyo progreso ya se guardo. Si no pudo guardarse ese progreso, no se envia el registro. Un cierre entre PUT exitoso y su confirmacion local puede requerir repetir la subida; no hay una transaccion distribuida entre storage y dispositivo. La limpieza de objetos huerfanos y fotos locales ya sincronizadas no se implementa aqui.

Las fotos nativas se copian al sandbox (documentos, o cache si documentos no esta disponible). En web se conserva un data URL, porque un blob URL del picker no sobrevive una recarga. Esto consume cuota local y puede fallar: no se descarta silenciosamente la foto para guardar solo el texto. El sistema operativo puede depurar cache; esa ruta y archivos reales requieren validacion en dispositivo.

Una vez preparados los adjuntos se envia `POST /sincronizacion` con `{ registros: [{ id, tipo, payload }] }`. El backend utiliza ese ID como `registroMovilId` y mantiene sus validaciones y restricciones unicas existentes por cliente. Solo una respuesta con el mismo ID y `sincronizado === true` permite marcar el registro; respuestas ausentes, ajenas o malformadas lo dejan pendiente.

No se modifican contratos API ni tablas. El rechazo concurrente/idempotencia contra PostgreSQL real sigue siendo parte de la etapa de integracion.

## Cambio de sesion durante solicitudes

El adaptador recibe la sesion completa y un callback que comprueba que sigue siendo la misma instancia activa. No toma el token de una variable global que pueda cambiar a otra cuenta. Comprueba la sesion antes de pedir firmas, subir archivos y enviar registros.

Una solicitud ya en vuelo no se cancela automaticamente. Si confirma una operacion de A despues del logout, se guarda su progreso o confirmacion solo en la cola capturada de A. No se inicia la siguiente solicitud ni se actualiza la pantalla de B. Las comprobaciones locales complementan la autorizacion del backend; no la reemplazan.

## Modulos y extension

| Archivo mobile | Responsabilidad |
| --- | --- |
| `services/offline/tipos.ts` | Contratos locales e interfaz minima de persistencia |
| `services/offline/cola.ts` | Identidad, formato, integridad, exclusion y mutaciones persistentes |
| `services/offline/sincronizador.ts` | Reintentos, progreso, confirmaciones y errores parciales con dependencias inyectadas |
| `services/almacenamientoLocal.ts` | Adaptar AsyncStorage/localStorage y construir la cola desde la sesion; detectar pendientes antiguos |
| `services/sincronizacion.ts` | Conectar el sincronizador con API y storage remoto, usando la sesion capturada |
| `services/adjuntosLocales.ts` | Preservar contenido de fotos segun plataforma |
| `App.tsx`, `screens/PantallaOperativa.tsx` | Componer login/panel y presentacion operativa; desmontar el panel al cambiar sesion |
| `hooks/useSesionMobile.ts`, `useDatosOperativosMobile.ts` | Sesion vigente y consultas/seleccion con descarte de respuestas anteriores |
| `hooks/usePendientesMobile.ts`, `useFormularioRegistrosMobile.ts`, `useFotoObservacion.ts` | Contador/envio, guardado previo y captura/seleccion de fotos; delegan al nucleo y adaptadores |

Para otro tipo de registro, definir su contrato compartido, implementarlo y autorizarlo en backend, luego agregar su captura local. No marcarlo sincronizado sin confirmacion. Para reemplazar la persistencia implementar `AlmacenamientoOffline`; mantener la misma instancia de adaptador durante su uso para compartir la exclusion por propietario.

Los archivos `store/offlineStore.ts`, `store/offline/database.ts` y `store/offline/sync.ts` son scaffolding previo, sin conexion al flujo activo. No usar esa cola en memoria para nuevos registros; el punto de entrada vigente esta documentado en arquitectura.

## Verificacion

```powershell
pnpm test
pnpm --filter agro-app-mobile exec tsc --noEmit
pnpm build
```

`pnpm test` compila primero API/tipos y luego el nucleo offline con `tsconfig.offline-tests.json` a `.cache/offline-tests`, ignorado por Git. `tests/mobile-offline.test.js` ejecuta ese mismo codigo con un adaptador de memoria y servicios remotos sustituidos; no es una implementacion paralela.

Cubre aislamiento cliente/usuario y vuelta a ingresar, colisiones de clave, escrituras simultaneas, limpieza, corrupcion sin sobrescritura, almacenamiento fallido/recuperacion, preservacion de legacy, progreso de fotos y reinicio del coordinador, respuesta perdida, error al guardar progreso, logout durante PUT/POST, errores parciales, confirmaciones invalidas y dos sincronizaciones simultaneas.

La guia [MOBILE_TESTING.md](MOBILE_TESTING.md) contiene el recorrido manual requerido en dispositivo. Sigue pendiente probar reinicio de app/sistema, cuotas, fotos reales y permisos con API/base/storage reales. La sesion y los padrones siguen en memoria: despues de reiniciar se necesita conexion para login y recarga de datos operativos antes de continuar la captura.
