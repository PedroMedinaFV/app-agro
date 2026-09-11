# UI/UX responsive

## Premisas

- La aplicacion web debe funcionar sin scroll horizontal en pantallas desktop, notebook, tablets y ventanas reducidas por paneles laterales del navegador.
- Las grillas de datos deben usar `DataTable` como componente base para mantener estilos, paginacion, acciones y comportamiento responsive consistentes.
- Las acciones de tabla se ubican al final de la fila.
- En anchos reducidos, las tablas dejan de comportarse como grilla horizontal y pasan a filas tipo card con etiqueta por campo.
- Los formularios densos deben usar componentes de input compartidos:
  - `DecimalInput` para decimales con punto o coma;
  - `SignedIntegerInput` para enteros que admiten negativos.

## Patron de tablas

`DataTable` es el patron por defecto para listados de padrones, precios, gastos, protocolos y planificaciones.

Comportamiento esperado:

- desktop amplio: encabezado visible y columnas en grilla;
- ancho intermedio o ventana reducida: filas verticales con labels por celda;
- paginacion siempre visible debajo;
- botones de accion al final;
- sin scroll horizontal como solucion primaria.

Si una pantalla necesita una grilla editable tipo planilla, debe resolver su responsive dentro de la pantalla, pero manteniendo la misma premisa: no depender de scroll horizontal para tareas frecuentes.
