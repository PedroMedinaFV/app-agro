# Diseño tecnico modulo NDVI

## Objetivo

Diseñar un modulo independiente para consultar y visualizar mapas NDVI por lote, conectado con la base geográfica de Agro App y orientado al seguimiento operativo.

El modulo debe permitir:

- asociar mapas NDVI a lotes;
- consultar evolución temporal del vigor;
- ver mapas y resúmenes por lote, campo, campaña y fecha;
- apoyar recorridas, observaciones y decisiones operativas;
- mantener trazabilidad de origen, proveedor, procesamiento y auditoría.

## Principios

- NDVI es modulo operativo/geoespacial, no parte del modelo de planificación económica.
- El lote es la unidad mínima de análisis.
- La geometría principal del lote viene de `LoteArchivoGeografico` procesado desde KML/KMZ.
- La planificación puede aportar contexto, pero no debe bloquear el uso de NDVI.
- Web concentra análisis, comparativas y administración.
- Mobile consume vistas livianas para campo, con foco en último mapa, alertas y recorridas.
- Todo dato importado o procesado debe guardar origen, fecha, proveedor y estado.
- Todo cambio manual o reprocesamiento debe auditarse.

## Alcance MVP

### Incluido

- Entidad para registrar escenas/mapas NDVI por lote.
- Carga inicial manual o por proceso backend controlado.
- Almacenamiento de raster/imagen renderizada en Supabase Storage u otro storage compatible.
- Resumen por lote: NDVI promedio, mínimo, máximo y variabilidad.
- Endpoint para consultar último NDVI por lote.
- Endpoint para listar historial NDVI por lote.
- Web: sección en seguimiento operativo/ficha de lote.
- Mobile: consulta del último NDVI y fecha disponible.
- Auditoría de carga, reprocesamiento y baja lógica.

### Fuera del MVP inicial

- Automatización completa satelital diaria.
- Prescripciones variables.
- Mapas de rinde.
- Comparación multiíndice avanzada.
- Descarga masiva de imágenes satelitales desde múltiples proveedores.
- Procesamiento pesado dentro del request HTTP.
- Edición manual de pixeles o polígonos NDVI.

## Relación con módulos existentes

### Lotes y geografía

El modulo requiere que el lote tenga una geometría confiable:

- `LoteApp` identifica el lote propio de Agro App.
- `LoteArchivoGeografico` guarda KML/KMZ, estado de procesamiento, GeoJSON y superficie calculada.
- Para recortar NDVI por lote se debe usar el archivo geográfico principal procesado.

Regla:

- Si el lote no tiene geometría procesada, puede guardar registros NDVI externos, pero no puede generar análisis espacial confiable.
- La UI debe mostrar el estado: `Sin geografía`, `Geografía pendiente`, `Geografía procesada`, `NDVI disponible`.

### Seguimiento operativo

La ficha de lote debe mostrar:

- último NDVI disponible;
- fecha de imagen;
- proveedor;
- promedio/min/max;
- miniatura o capa renderizada;
- vínculo a historial.

### Observaciones

Las observaciones de campo deben poder verse junto al mapa NDVI para validar manchas o zonas de bajo vigor.

Relación futura:

- una observación puede quedar vinculada a una escena NDVI o a una zona detectada;
- el técnico puede crear una observación desde el mapa.

### Planificación

Planificación no consume NDVI en el MVP.

Uso futuro posible:

- comparar margen planificado vs vigor;
- priorizar recorridas por lotes con bajo NDVI;
- enriquecer seguimiento por campaña.

## Modelo de datos propuesto

### LoteMapaNdvi

Registro principal de una escena NDVI asociada a un lote.

Campos sugeridos:

- `id`
- `clienteId`
- `loteAppId`
- `loteErpId` opcional
- `campoAppId`
- `campoErpId` opcional
- `campaniaErpId` opcional
- `fechaImagen`
- `fechaProcesamiento`
- `proveedor`
- `origen`
- `resolucionMetros` opcional
- `nubosidadPorcentaje` opcional
- `ndviPromedio`
- `ndviMinimo`
- `ndviMaximo`
- `ndviDesvio`
- `superficieAnalizadaHa` opcional
- `storageBucket`
- `storagePathRaster` opcional
- `storagePathPreview` opcional
- `storagePathTiles` opcional
- `bboxGeoJson` opcional
- `metadata` JSON opcional
- `estado`
- `activo`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Estados:

- `pendiente_procesamiento`
- `procesado`
- `rechazado`
- `archivado`

Origen:

- `manual`
- `proveedor_api`
- `importacion`
- `proceso_interno`

Índices recomendados:

- `[clienteId]`
- `[loteAppId]`
- `[campoAppId]`
- `[fechaImagen]`
- `[estado]`
- `[clienteId, loteAppId, fechaImagen]`
- `[clienteId, storageBucket, storagePathRaster]` único cuando exista raster

### LoteMapaNdviZona

Opcional para una segunda etapa. Sirve para guardar zonas o clases internas del lote.

Campos sugeridos:

- `id`
- `clienteId`
- `mapaNdviId`
- `categoria`
- `ndviPromedio`
- `superficieHa`
- `geometriaGeoJson`
- `color`
- `createdAt`
- `updatedAt`

Categorías iniciales:

- `bajo`
- `medio`
- `alto`

Para MVP se puede calcular visualmente sin persistir zonas. Persistirlas tiene sentido cuando se quieran generar recorridas o alertas.

## Contratos TypeScript

Agregar en `packages/tipos`:

```ts
export type EstadoMapaNdvi = 'pendiente_procesamiento' | 'procesado' | 'rechazado' | 'archivado';
export type OrigenMapaNdvi = 'manual' | 'proveedor_api' | 'importacion' | 'proceso_interno';

export type LoteMapaNdvi = {
  id: string;
  clienteId: string;
  loteAppId: string;
  loteErpId?: string;
  campoAppId: string;
  campoErpId?: string;
  campaniaErpId?: string;
  fechaImagen: string;
  fechaProcesamiento?: string;
  proveedor: string;
  origen: OrigenMapaNdvi;
  resolucionMetros?: number;
  nubosidadPorcentaje?: number;
  ndviPromedio?: number;
  ndviMinimo?: number;
  ndviMaximo?: number;
  ndviDesvio?: number;
  superficieAnalizadaHa?: number;
  storageBucket?: string;
  storagePathRaster?: string;
  storagePathPreview?: string;
  storagePathTiles?: string;
  bboxGeoJson?: unknown;
  metadata?: unknown;
  estado: EstadoMapaNdvi;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MapasNdviLoteResponse = {
  loteAppId: string;
  ultimo?: LoteMapaNdvi;
  historial: LoteMapaNdvi[];
};
```

## API propuesta

### Consultas

`GET /ndvi/lotes/:loteAppId`

Devuelve último mapa y historial resumido del lote.

Permisos:

- `campos:leer` o `observaciones:leer`
- El usuario debe tener alcance sobre el campo/lote.

`GET /ndvi/lotes/:loteAppId/ultimo`

Devuelve sólo la última escena procesada.

`GET /ndvi/mapas/:mapaNdviId`

Devuelve detalle de una escena.

### Carga manual

`POST /ndvi/lotes/:loteAppId/upload-url`

Crea URL firmada para subir raster, preview o archivo fuente.

`POST /ndvi/lotes/:loteAppId`

Registra metadata de una escena NDVI ya subida o importada.

Permisos:

- `registros:crear` para carga operativa simple;
- `planificacion:configurar` o permiso futuro `ndvi:gestionar` para administración avanzada.

### Reprocesamiento

`POST /ndvi/mapas/:mapaNdviId/reprocesar`

Recalcula métricas y preview si existe archivo fuente.

Debe ejecutarse asincrónicamente si el procesamiento es pesado.

## Permisos

Permisos nuevos sugeridos:

- `ndvi:leer`
- `ndvi:gestionar`
- `ndvi:procesar`

Para no agrandar el MVP, inicialmente se puede mapear:

- admin: todos;
- planificador: leer;
- responsable_compras: sin acceso por defecto;
- operador_campo: leer lotes asignados.

Cuando NDVI madure como modulo propio, conviene agregar permisos explícitos.

## Flujo de procesamiento

### Etapa 1: carga manual/importada

1. Usuario selecciona lote.
2. Backend valida permisos y geometría.
3. Usuario sube archivo o informa URL/proveedor externo.
4. Backend crea `LoteMapaNdvi` en `pendiente_procesamiento`.
5. Worker/proceso calcula métricas si tiene raster compatible.
6. Backend marca `procesado` o `rechazado`.
7. Web/mobile consumen la escena procesada.

### Etapa 2: proveedor satelital

1. Job consulta proveedor por geometría y rango de fechas.
2. Descarta escenas con nubosidad alta.
3. Descarga o referencia raster NDVI.
4. Recorta por geometría del lote.
5. Calcula métricas.
6. Genera preview/tiles.
7. Guarda `LoteMapaNdvi`.

### Etapa 3: alertas

1. Comparar último NDVI contra histórico del lote.
2. Detectar caída significativa.
3. Crear alerta operativa.
4. Sugerir recorrida u observación.

## Visualización web

Ubicación recomendada:

- `SeguimientoOperativoScreen`
- ficha de lote;
- futura pantalla `Mapas NDVI`.

Componentes:

- `NdviResumenLote`
- `NdviHistorialLote`
- `NdviMapaPreview`
- `NdviDetalleEscena`

Primera UI:

- card de último NDVI;
- fecha;
- promedio/min/max;
- estado;
- preview;
- tabla de historial.

No se recomienda construir al inicio un GIS completo. Primero preview + métricas; luego mapa interactivo.

## Visualización mobile

Primera versión:

- mostrar último NDVI del lote;
- fecha de imagen;
- semáforo simple;
- preview liviana si está disponible;
- botón para crear observación relacionada.

Semáforo sugerido:

- bajo: `ndviPromedio < 0.35`
- medio: `0.35 <= ndviPromedio < 0.60`
- alto: `ndviPromedio >= 0.60`

Estos umbrales deben ser configurables a futuro por cultivo/campaña.

## Storage

Buckets sugeridos:

- `lotes-geografia`: ya usado o equivalente para KML/KMZ.
- `ndvi-raster`: raster/archivos fuente.
- `ndvi-preview`: PNG/JPEG renderizado.
- `ndvi-tiles`: tiles si se implementa mapa interactivo.

Convención de paths:

```txt
clientes/{clienteId}/lotes/{loteAppId}/ndvi/{fechaImagen}/{mapaNdviId}/raster.tif
clientes/{clienteId}/lotes/{loteAppId}/ndvi/{fechaImagen}/{mapaNdviId}/preview.png
clientes/{clienteId}/lotes/{loteAppId}/ndvi/{fechaImagen}/{mapaNdviId}/metadata.json
```

## Auditoría

Auditar:

- alta de mapa NDVI;
- reprocesamiento;
- cambio de metadata;
- archivo rechazado;
- archivado/restauración;
- cambio de proveedor/origen;
- eliminación lógica.

Entidad sugerida:

- `LoteMapaNdvi`

Acciones:

- `crear`
- `actualizar`
- `procesar`
- `rechazar`
- `archivar`
- `restaurar`

## Validaciones

- El lote debe pertenecer al `clienteId`.
- El usuario debe tener alcance sobre el campo/lote.
- `fechaImagen` no puede ser futura.
- El archivo debe tener tipo permitido.
- Si se calcula superficie, no debe exceder groseramente la superficie total del lote.
- Si el lote tiene geometría principal, la escena debe estar asociada a esa geometría o registrar por qué no se usó.
- No permitir dos mapas activos idénticos para mismo lote, proveedor y fecha, salvo que tengan diferente versión/procesamiento.

## Proveedores posibles

Opciones a evaluar:

- Sentinel-2 vía servicio externo;
- Google Earth Engine;
- Sentinel Hub;
- Planet, si se justifica costo;
- carga manual de GeoTIFF/PNG para MVP técnico.

Recomendación MVP:

Empezar con carga manual/importada y modelo listo para proveedor. Automatizar proveedor cuando el flujo operativo y la visualización ya estén validados.

## Riesgos

- Procesamiento raster puede ser pesado para API HTTP.
- KML/KMZ mal procesado genera recortes incorrectos.
- Imágenes con nubes pueden confundir análisis.
- NDVI varía por cultivo, estadio y fecha; no conviene usar umbrales fijos como verdad agronómica.
- Storage y tiles pueden crecer rápido.
- Mobile no debe descargar archivos pesados.

## Roadmap sugerido

### Fase 0 - Diseño y contratos

- [ ] Agregar documento técnico.
- [ ] Definir tipos compartidos.
- [ ] Definir migración Prisma.
- [ ] Definir permisos.

### Fase 1 - Base persistente

- [ ] Crear tabla `LoteMapaNdvi`.
- [ ] Crear endpoints de consulta.
- [ ] Integrar auditoría.
- [ ] Validar alcance por usuario.

### Fase 2 - Carga manual

- [ ] Crear upload-url.
- [ ] Registrar metadata.
- [ ] Guardar preview.
- [ ] Mostrar último NDVI en ficha de lote web.

### Fase 3 - Mobile operativo

- [ ] Mostrar último NDVI del lote.
- [ ] Semáforo simple.
- [ ] Crear observación desde lote con contexto NDVI.

### Fase 4 - Procesamiento

- [ ] Worker o script de procesamiento.
- [ ] Cálculo de métricas.
- [ ] Reprocesamiento.
- [ ] Historial temporal.

### Fase 5 - Automatización proveedor

- [ ] Elegir proveedor.
- [ ] Importar escenas por lote/campo.
- [ ] Manejar nubosidad.
- [ ] Generar alertas.

## Decisiones abiertas

- Proveedor satelital inicial.
- Formato fuente aceptado para MVP: GeoTIFF, PNG georreferenciado, URL externa o archivo procesado por tercero.
- Si NDVI debe asociarse a campaña obligatoriamente o sólo inferirse por fecha.
- Si se persisten zonas internas de vigor en MVP o sólo métricas agregadas.
- Si se agrega permiso explícito `ndvi:*` desde el inicio.
- Si los mapas se versionan por reprocesamiento.
