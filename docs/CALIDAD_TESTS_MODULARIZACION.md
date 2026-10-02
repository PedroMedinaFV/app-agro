# Calidad, tests y modularizacion

Este documento define reglas obligatorias para que Agro App pueda crecer sin volverse fragil. Aplica a funcionalidades nuevas y a mejoras sobre funcionalidades existentes.

## Principio

Cada feature debe entregar tres cosas juntas:

- comportamiento funcionando;
- tests proporcionales al riesgo;
- codigo modular y reutilizable.

No alcanza con que compile. Una funcionalidad queda realmente lista cuando puede evolucionar sin romper permisos, datos de otros clientes, flujos mobile/offline ni pantallas relacionadas.

## Bloque de tests por feature

Toda feature nueva debe incluir un bloque de tests fuerte. Para features existentes, cada cambio relevante debe agregar o mejorar tests del modulo tocado.

El bloque minimo esperado es:

- tests de reglas puras en `utils`, helpers o servicios sin dependencias externas;
- tests de servicios backend cuando hay validaciones de dominio, permisos, alcance por cliente/campo, auditoria, idempotencia o transacciones;
- tests de contratos/serializacion cuando cambia una respuesta consumida por web o mobile;
- tests de componentes o hooks cuando una pantalla contiene estados complejos, filtros, acciones masivas o flujos de guardado;
- tests de sincronizacion/offline cuando el flujo acepta reintentos, adjuntos, errores parciales o registros pendientes.

Si una capa queda sin test automatico por limitacion tecnica momentanea, debe quedar documentado en el PR o en el doc del modulo con:

- que no se pudo automatizar;
- como se valido manualmente;
- que test debe agregarse despues.

## Documentacion de tests

Cada modulo debe documentar sus tests relevantes en el documento funcional/tecnico correspondiente o en una seccion de este documento si todavia no tiene doc propio.

El objetivo no es repetir el codigo del test, sino dejar claro que comportamiento protege. La documentacion debe permitir que una persona nueva entienda rapidamente:

- que regla se esta validando;
- por que importa;
- que entrada o escenario se usa;
- que resultado se espera;
- donde vive el test automatico.

Formato recomendado:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `nombre del test` | `ruta/al/test` | Regla protegida | Datos o flujo probado | Resultado observable |

Ejemplo:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `rechaza observacion fuera del campo asignado` | `apps/api/src/services/observaciones/*.test.ts` | Alcance por campo del operador | Usuario operador intenta crear observacion sobre lote no asignado | Backend responde error de permisos y no persiste nada |
| `calcula margen bruto de linea` | `apps/web/src/utils/planificacion/*.test.ts` | Formula economica de planificacion | Hectareas, rinde, precio, costo productivo y gastos comerciales conocidos | Margen bruto coincide con el valor esperado |
| `no duplica pendiente offline al reintentar` | `apps/mobile/src/services/*.test.ts` | Idempotencia mobile/offline | Registro con `registroMovilId` se sincroniza dos veces | El backend conserva un solo registro sincronizado |

Cuando se agrega un test por bug corregido, documentar el caso con una descripcion concreta del problema que evita. Ejemplo: "evita que un operador vea observaciones de otro cliente" es mejor que "test de permisos".

Los tests triviales no necesitan documentacion individual. Si un helper tiene muchos casos pequenos, se puede documentar el grupo:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `formatters` | `apps/web/src/utils/formatters.test.ts` | Formato de fecha, moneda y numeros | Valores validos, vacios y decimales con coma | La UI muestra formatos consistentes sin duplicar logica |

### Catalogo inicial

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `admin conserva permisos criticos de configuracion, cierre y auditoria` | `tests/auth-permisos.test.js` | Matriz base de permisos del rol admin | Se consulta el set de permisos de `admin` | Incluye configurar ERP, gestionar usuarios, cerrar planificacion y leer auditoria |
| `operador_campo puede cargar registros operativos pero no configurar planificacion` | `tests/auth-permisos.test.js` | Separacion entre operacion de campo y administracion | Se consultan permisos de `operador_campo` | Puede crear/sincronizar registros operativos y no puede configurar planificacion ni leer auditoria |
| `rol desconocido cae a permisos de operador_campo` | `tests/auth-permisos.test.js` | Fallback seguro de rol | Se pide permisos para un rol inexistente | Devuelve los permisos de `operador_campo` |
| `requierePermiso bloquea a un operador sin permiso administrativo` | `tests/middleware-permisos.test.js` | Middleware de autorizacion backend | Operador intenta usar `planificacion:configurar` | Responde 403 y no ejecuta `next` |
| `requierePermiso permite avanzar a un admin con permiso requerido` | `tests/middleware-permisos.test.js` | Middleware de autorizacion backend | Admin usa `planificacion:configurar` | Ejecuta `next` sin respuesta de error |
| `requiereAlgunPermiso permite avanzar si el rol tiene al menos uno de los permisos` | `tests/middleware-permisos.test.js` | Autorizacion por permisos alternativos | Responsable de compras requiere `auditoria:leer` o `costos:gestionar` | Ejecuta `next` porque tiene `costos:gestionar` |
| `autenticacionBasica rechaza requests sin Bearer token` | `tests/middleware-autenticacion.test.js` | Barrera de autenticacion backend | Request sin header `Authorization` | Responde 401 y no ejecuta `next` |
| `autenticacionBasica rechaza token invalido o expirado` | `tests/middleware-autenticacion.test.js` | Validacion de JWT | Request con token invalido | Responde 401 y no ejecuta `next` |
| `autenticacionBasica carga usuario y permite avanzar con token valido` | `tests/middleware-autenticacion.test.js` | Propagacion de identidad autenticada | Request con JWT valido | Carga `req.user` y ejecuta `next` |
| `manejadorErrores responde 413 controlado cuando el JSON supera el limite` | `tests/middleware-errores.test.js` | Respuesta controlada ante payload grande | Error `entity.too.large` de body parser | Responde 413 con mensaje operativo |
| `manejadorErrores no expone detalle interno para errores sin statusCode` | `tests/middleware-errores.test.js` | Fallback de errores no controlados | Error comun sin `statusCode` | Responde 500 con error generico |
| `manejadorErrores respeta statusCode y mensaje de errores controlados` | `tests/middleware-errores.test.js` | Respuestas de errores de dominio | Error con `statusCode = 403` | Responde 403 con mensaje controlado |
| `obtenerSuperficieInicialLote usa la productiva sin superar la total` | `tests/planificacion-helpers.test.js` | Superficie inicial sugerida para planificacion | Lote con superficie productiva menor o mayor que total | Usa la productiva y nunca supera la total |
| `lineaPlanificacionEstaCompleta exige protocolo, destino, hectareas, rinde y precio positivos` | `tests/planificacion-helpers.test.js` | Criterio de linea completa | Linea completa y variantes con datos faltantes | Solo la linea con todos los campos requeridos queda completa |
| `obtenerClavesDuplicadas detecta duplicados por campania, campo, lote y actividad` | `tests/planificacion-helpers.test.js` | Regla de duplicados de planificacion | Dos lineas comparten lote/actividad en una campania | Devuelve la clave duplicada esperada |
| `calcularResumenPlanificacion suma margen, ingreso, costo y solo hectareas con protocolo` | `tests/planificacion-helpers.test.js` | Totales del resumen de planificacion | Lineas con y sin protocolo | Suma montos y solo cuenta hectareas planificadas con protocolo |
| `calcularGastosComercialesLinea combina items por tonelada y por hectarea` | `tests/planificacion-helpers.test.js` | Calculo de gastos comerciales | Items `Tn` y `Ha` sobre una linea con produccion conocida | Devuelve la suma esperada por tonelada y hectarea |
| `recalcularLineaPlanificacion recalcula ingreso neto, costo y margen con protocolo y gastos` | `tests/planificacion-helpers.test.js` | Formula economica de linea | Linea con rinde, precio, gasto comercial y costo de protocolo | Recalcula ingreso bruto, gasto, neto, costo y margen |
| `mapearPadronCampo arma erpId por empresa y normaliza nombre y fecha nula` | `tests/erp-mappers.test.js` | Mapper ERP de campos | Campo ALBOR con espacios y fecha nula | Genera `empresa:x:campo:id`, trimea nombre y usa fecha epoch |
| `mapearPadronLote vincula lote con campo ERP de la misma empresa` | `tests/erp-mappers.test.js` | Mapper ERP de lotes | Lote ALBOR con `idCampo` | Genera lote y `campoErpId` con la misma empresa |
| `mapearAgriculturaCultivo conserva empresa y arma referencias operativas` | `tests/erp-mappers.test.js` | Mapper ERP de cultivos | Cultivo con campo, lote, actividad, especie y campania | Genera referencias normalizadas para cada entidad |
| `mappers globales de actividad, insumo y servicio no duplican por empresa` | `tests/erp-mappers.test.js` | Padrones ERP tratados como globales | Actividad, insumo y servicio recibidos con empresa | Se guardan con `empresaErpId = global` e IDs globales |
| `mapearRespuestaPadronesCampos falla con mensaje ERP cuando succeeded es false` | `tests/erp-mappers.test.js` | Manejo de errores de respuesta ERP | Respuesta fallida de `Padrones/Campos` | Lanza error con mensaje del ERP |
| `procesarSincronizacion deja pendiente un tipo no soportado sin marcarlo como sincronizado` | `tests/offline-sync.test.js` | Sincronizacion offline ante tipos desconocidos | Mobile envia un registro con `tipo = registro-campo` | Queda pendiente con error controlado y no se marca sincronizado |
| `procesarSincronizacion deja pendiente una observacion con payload invalido` | `tests/offline-sync.test.js` | Validacion de payload offline antes de persistir | Mobile envia observacion sin campos obligatorios | Queda pendiente con error controlado y no toca persistencia |

## Casos que siempre requieren tests

No se debe cerrar una feature sin tests cuando toca:

- autenticacion, permisos o roles;
- filtros por `clienteId`, campos asignados o empresas ERP;
- altas, ediciones, cierres, vinculaciones o bajas logicas;
- planificacion, costos, precios, gastos, protocolos o calculos economicos;
- sincronizacion ERP;
- mobile offline, idempotencia o adjuntos;
- migraciones Prisma con reglas de negocio nuevas;
- auditoria;
- endpoints usados por mas de una superficie, por ejemplo web y mobile.

## Reutilizacion antes de duplicar

Antes de crear codigo nuevo, revisar si ya existe una pieza reutilizable:

- contratos en `packages/tipos`;
- cliente HTTP en `apps/web/src/services/api.ts`;
- componentes base como `DataTable`, `Panel`, `PageHeader`, `Button`, `IconButton`, inputs especializados y modales existentes;
- hooks de dominio en `apps/web/src/hooks`;
- helpers en `apps/web/src/utils`;
- servicios backend en `apps/api/src/services`;
- middleware de autenticacion, permisos, validacion y errores;
- funciones de auditoria, formateo, normalizacion y vinculacion sugerida.

Duplicar codigo solo es aceptable como paso transitorio chico y documentado. Si se detecta la segunda copia de una regla o patron, se debe extraer una abstraccion simple.

## Modularizacion esperada

La feature debe respetar esta separacion:

- `packages/tipos`: contratos compartidos entre API, web y mobile.
- `apps/api/src/routes`: endpoints delgados, sin reglas de negocio largas.
- `apps/api/src/services`: reglas de dominio, Prisma, auditoria, integraciones y transacciones.
- `apps/web/src/services`: llamadas HTTP centralizadas.
- `apps/web/src/hooks`: estado, carga, permisos locales y handlers.
- `apps/web/src/components`: piezas visuales reutilizables o componentes especificos del modulo.
- `apps/web/src/utils`: calculos puros, formateo, normalizacion y helpers sin efectos.
- `apps/mobile/src/services` y `apps/mobile/src/store`: API, persistencia local y sincronizacion.

Una screen no deberia acumular formularios, tablas, filtros, calculos, requests y reglas de negocio al mismo tiempo. Si una pantalla supera aproximadamente 350-450 lineas o mezcla responsabilidades claras, debe dividirse.

## Checklist para nueva feature

- [ ] Contratos compartidos definidos o reutilizados.
- [ ] Servicio backend con reglas de negocio fuera de la route.
- [ ] Permisos y alcance validados en backend.
- [ ] Auditoria agregada si modifica datos.
- [ ] Cliente HTTP centralizado.
- [ ] Hook o modulo de estado en frontend cuando hay carga o handlers.
- [ ] Componentes reutilizables o especificos bien separados.
- [ ] Helpers puros extraidos cuando hay calculos o normalizacion.
- [ ] Tests automaticos agregados en las capas de mayor riesgo.
- [ ] Validacion manual documentada solo para lo que no se puede automatizar todavia.
- [ ] `pnpm build` o builds parciales relevantes ejecutados.

## Checklist para feature existente

Al modificar una feature existente:

- [ ] Revisar si hay codigo duplicado que pueda extraerse sin agrandar el cambio innecesariamente.
- [ ] Agregar tests sobre el bug, regla o flujo tocado.
- [ ] No aumentar el tamano de una screen grande si el cambio permite extraer un componente/hook/helper.
- [ ] No crear tipos locales si el contrato cruza API, web o mobile.
- [ ] No crear llamadas `fetch` nuevas fuera del cliente API compartido.
- [ ] Actualizar el documento del modulo si cambia el flujo funcional.

## Estrategia de adopcion sobre lo existente

No hace falta detener el producto para refactorizar todo. La adopcion debe ser incremental:

1. Cada feature nueva nace con tests y modularizacion.
2. Cada cambio sobre un modulo existente mejora un punto concreto de test o reutilizacion.
3. Los modulos de mayor riesgo tienen prioridad: permisos, planificacion, ERP, mobile offline, adjuntos, auditoria y recorridas.
4. Los archivos grandes se achican cuando se los toca por una razon funcional real.

La meta no es refactorizar por estetica. La meta es bajar riesgo, facilitar cambios y evitar que el costo de agregar features crezca cada sprint.
