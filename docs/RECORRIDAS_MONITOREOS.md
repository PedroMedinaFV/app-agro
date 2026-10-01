# Recorridas y monitoreos

## Objetivo

El modulo de recorridas organiza el trabajo operativo de campo: permite planificar o registrar una visita, asociarla a un campo/lote, agrupar observaciones y cerrar el recorrido con trazabilidad.

La idea es que funcione como puente entre:

- observaciones con fotos y ubicacion;
- ficha operativa de lote;
- mapas NDVI y alertas futuras;
- mobile offline;
- seguimiento web.

## Alcance MVP

Incluido:

- alta de recorrida desde web;
- campo obligatorio y lote opcional;
- objetivo operativo de la recorrida;
- estado `borrador`, `en_curso`, `cerrada` o `cancelada`;
- cierre de recorrida;
- vinculacion de observaciones a recorridas abiertas;
- contador de observaciones y severidad maxima;
- permisos especificos;
- auditoria al crear y cerrar;
- validacion de alcance por cliente/campo/lote.

Fuera del primer corte:

- asignacion de recorrida a multiples usuarios;
- checklists por cultivo/adversidad;
- recorrida con waypoints ordenados;
- mapa interactivo completo;
- generacion automatica desde NDVI;
- sincronizacion offline completa de recorridas mobile.

## Modelo funcional

### RecorridaCampo

Representa una visita o monitoreo operativo.

Campos principales:

- `clienteId`
- `usuarioId`
- `campoAppId`
- `loteAppId`
- `campaniaErpId`
- `titulo`
- `objetivo`
- `estado`
- `fechaInicio`
- `fechaCierre`
- `observaciones`
- `origen`
- `cantidadObservaciones`
- `severidadMaxima`

### ObservacionCampo

`ObservacionCampo` puede tener `recorridaId` opcional.

Reglas:

- una observacion puede existir sin recorrida;
- una observacion solo puede vincularse a una recorrida abierta;
- la recorrida debe pertenecer al mismo cliente y campo;
- si la recorrida tiene lote, la observacion debe usar ese mismo lote;
- al crear una observacion vinculada, se actualiza el contador y severidad maxima de la recorrida.

## Objetivos de recorrida

Valores iniciales:

- `monitoreo_general`
- `plagas`
- `malezas`
- `enfermedades`
- `emergencia`
- `cosecha`
- `otro`

Estos valores son intencionalmente simples. Si mas adelante se necesita un padron configurable de adversidades o motivos, debe modelarse como maestro separado.

## Estados

- `borrador`: recorrida preparada pero no iniciada.
- `en_curso`: recorrida activa que puede recibir observaciones.
- `cerrada`: recorrida finalizada, no recibe nuevas observaciones.
- `cancelada`: recorrida descartada.

Regla MVP:

- web crea recorridas en `en_curso`;
- el cierre es explicito;
- no se agregan observaciones a recorridas cerradas o canceladas.

## Permisos

Permisos nuevos:

- `recorridas:crear`
- `recorridas:leer`
- `recorridas:cerrar`

Asignacion actual:

- `admin`: crear, leer y cerrar;
- `planificador`: leer y cerrar;
- `responsable_compras`: leer;
- `operador_campo`: crear, leer y cerrar.

El backend siempre valida cliente y alcance de campo/lote. La UI solo ayuda a no mostrar opciones invalidas.

## API

Endpoints:

- `GET /recorridas`
- `GET /recorridas/:id`
- `POST /recorridas`
- `POST /recorridas/:id/cerrar`

Integracion con observaciones:

- `POST /observaciones` acepta `recorridaId` opcional.

## Flujo web actual

1. El usuario entra a `Monitoreos`.
2. La pantalla carga recorridas y padrones operativos necesarios.
3. El usuario crea una recorrida para campo/lote.
4. La recorrida aparece como abierta.
5. En `Observaciones`, el usuario puede seleccionar una recorrida abierta compatible.
6. Al guardar la observacion, queda vinculada a la recorrida.
7. La recorrida incrementa contador de hallazgos y severidad maxima.
8. El usuario cierra la recorrida cuando finaliza el trabajo.

## Flujo mobile esperado

1. El operador ve recorridas abiertas de sus campos asignados.
2. Puede iniciar una recorrida o crear una nueva en campo.
3. Carga observaciones con GPS y fotos.
4. Si no hay conexion, la recorrida y observaciones quedan pendientes.
5. Al sincronizar, backend valida permisos, alcance e idempotencia.
6. La web ve recorrida, hallazgos y adjuntos.

## Relacion con NDVI

NDVI debe alimentar recorridas, no reemplazarlas.

Uso futuro:

- detectar lote con bajo vigor;
- sugerir recorrida;
- mostrar ultimo NDVI al crear observacion;
- vincular observacion a escena NDVI;
- comparar hallazgo de campo contra imagen.

Regla:

- NDVI vive en su modulo;
- recorridas consumen contexto NDVI cuando exista;
- una recorrida no depende de que haya NDVI disponible.

## Relacion con KML/KMZ

La geografia del lote es necesaria para experiencia mobile avanzada:

- mostrar perimetro;
- ubicar al operador dentro del lote;
- guardar puntos de observacion;
- asociar hallazgos a zonas del lote.

Para MVP, la recorrida puede funcionar sin geometria, pero debe mostrar estado geografico cuando se use en mobile/mapa.

## UI y modularizacion

Las pantallas de monitoreo deben mantenerse pequenas y separadas:

- `MonitoreosScreen`: composicion de pantalla.
- `useRecorridas`: carga, guardado, cierre y filtros.
- `FormularioRecorrida`: alta/edicion simple.
- `TablaRecorridas`: listado y acciones.
- `SelectorRecorrida`: selector reutilizable para observaciones/mobile.

Regla:

- no agregar mas logica de negocio a `MonitoreosScreen`;
- el proximo cambio funcional debe extraer hook/componentes antes de crecer la pantalla.

## Validaciones pendientes

- [ ] Aplicar migracion en base local.
- [ ] Crear recorrida desde web.
- [ ] Crear observacion asociada a recorrida.
- [ ] Ver contador de hallazgos actualizado.
- [ ] Cerrar recorrida.
- [ ] Confirmar que una recorrida cerrada no aparece como opcion en observaciones.
- [ ] Validar operador con campos asignados.
- [ ] Probar observacion mobile futura con `recorridaId`.

## Proximos pasos recomendados

1. Modularizar `MonitoreosScreen` y `ObservacionesScreen` antes de seguir agregando comportamiento.
2. Crear `SelectorRecorrida` reutilizable.
3. Agregar detalle de recorrida con observaciones vinculadas.
4. Preparar contrato mobile/offline para recorridas.
5. Conectar recorrido con mapa/KML cuando este listo el visor geografico.
