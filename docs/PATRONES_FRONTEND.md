# Patrones Frontend Base

Este documento define patrones obligatorios para mantener la web rapida, consistente y escalable.

## Listados livianos

Las pantallas de listado deben cargar solo la informacion necesaria para mostrar la grilla o resumen inicial.

- No cargar snapshots pesados al ingresar si solo se muestra un listado.
- No pedir padrones auxiliares hasta que el usuario abra un modal o editor que realmente los necesita.
- Usar cache por sesion/token para padrones importados o maestros de baja mutacion.
- Invalidar cache cuando se sincronizan padrones o se guarda una entidad que cambia esos datos.

## Editores con borrador local

Los editores con muchas filas, selects, calculos o estructuras anidadas deben trabajar con un borrador local.

Flujo esperado:

- el listado mantiene estado global liviano;
- al abrir crear/editar/copiar se arma un borrador local;
- cada input modifica solo ese borrador;
- los calculos derivados se recalculan dentro del borrador;
- al guardar se envia el borrador al backend;
- despues de guardar se actualiza o refresca el estado global;
- cancelar cierra el editor sin modificar estado global.

Este patron evita renders globales en cada tecla y reduce demoras en pantallas como protocolos, planificacion, gastos y futuras grillas operativas.

## Datos derivados

Los datos derivados de listas grandes deben memoizarse.

Ejemplos:

- mapas por ID para evitar `find` repetidos en cada fila;
- listas ordenadas de select;
- filtros dependientes de una seleccion;
- totales y subtotales de grillas.

## Inputs de fecha y numero

Los inputs deben adaptar el formato de backend al formato HTML esperado.

- `type="date"` debe recibir `YYYY-MM-DD`, aunque backend devuelva ISO completo.
- decimales deben permitir punto y coma desde teclado numerico.
- enteros relativos deben permitir valores negativos cuando el negocio lo requiera.

## UX durante requests

Toda accion que viaje al backend debe mostrar el bloqueo global de carga cuando corresponda y un toast de resultado.

La carga de datos de una pantalla debe diferenciar entre:

- carga inicial liviana;
- carga diferida para edicion;
- guardado;
- sincronizacion ERP.
