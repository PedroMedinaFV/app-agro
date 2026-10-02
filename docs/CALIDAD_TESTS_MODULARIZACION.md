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
