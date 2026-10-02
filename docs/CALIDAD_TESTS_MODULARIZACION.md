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
