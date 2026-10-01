# Arquitectura frontend

## Objetivo

Mantener la web y mobile escalables, evitando que un archivo acumule pantalla, estado, reglas de negocio, mocks y llamadas a API.

## Premisa desde este punto

Cada nueva funcionalidad debe separarse por responsabilidad:

- `screens`: pantallas completas asociadas a una vista o flujo principal.
- `components`: piezas visuales reutilizables o de layout que no representan una pantalla completa.
- `hooks`: estado, carga de datos, handlers y reglas de interaccion de una funcionalidad.
- `services`: clientes HTTP y adaptadores de API.
- `data`: datos demo, seeds frontend o fallbacks locales.
- `utils`: funciones puras de formato, calculo o transformacion.

## Regla de tamano y escalabilidad

Una pantalla no debe crecer indefinidamente. Cuando una `screen` supera aproximadamente 350-450 lineas o mezcla carga de datos, filtros, formulario, tabla y reglas de negocio, debe partirse antes de agregar nuevas funcionalidades.

Patron recomendado:

- `screens/ModuloScreen.tsx`: compone la pantalla y conecta piezas.
- `hooks/useModulo.ts`: carga de datos, guardado, filtros y handlers.
- `components/modulo/FormularioModulo.tsx`: formulario principal.
- `components/modulo/TablaModulo.tsx`: listado, columnas y acciones.
- `components/modulo/SelectorModulo.tsx`: selector reutilizable por otras pantallas.
- `utils/modulo/helpersModulo.ts`: funciones puras del dominio.

Regla practica:

- si una funcion necesita estado o API, va al hook;
- si una funcion transforma/calcula sin efectos, va a `utils`;
- si un bloque JSX se repite o supera una responsabilidad clara, va a `components`;
- la `screen` no debe contener reglas de negocio largas.

Nombres:

- usar nombres en espanol o mixtos amigables cuando mejoren legibilidad del equipo;
- preferir `helpersLotes`, `helpersPlanificacion`, `useRecorridas`, `TablaRecorridas`;
- evitar sufijos historicos como `Demo` cuando la funcionalidad ya es real.

## Criterio para crear una screen

Usar `screens` cuando el componente representa una vista navegable o una seccion principal del producto.

Ejemplos actuales:

- `HomeScreen`: vista inicial/resumen operativo.
- `PlanificacionScreen`: planilla de planificacion agricola.
- `ProtocolosScreen`: grilla y editor de protocolos productivos.
- `EmpresasErpScreen`: configuracion de empresas ERP asociadas a AGRO.

Una screen puede recibir muchos props al principio, pero si crece demasiado se debe dividir internamente en componentes mas chicos.

## Criterio para crear un component

Usar `components` cuando la pieza sea reutilizable o estructural, y no tenga identidad de pantalla.

Ejemplos actuales:

- `Layout`: header, sidebar y contenedor principal.
- `LoginPanel`: panel visual de acceso Microsoft con fallback demo admin para desarrollo local.

Si un componente empieza a manejar reglas de negocio, esa logica debe ir a un hook.

## Criterio para crear un hook

Usar `hooks` cuando haya estado, efectos, llamadas a API o reglas de interaccion.

Ejemplos actuales:

- `useDemoAuth`: sesion demo y fallback local.
- `useErpDemo`: snapshot ERP, empresas disponibles y seleccion de empresas AGRO.
- `usePlanificacionDemo`: estado, metricas, validaciones y guardado de planificacion.
- `useProtocolosDemo`: estado, creacion, copia, edicion y guardado de protocolos.

## Rol de App.tsx

`App.tsx` debe quedar como orquestador:

- inicializa hooks principales;
- define la vista activa;
- arma titulo y descripcion;
- compone `Layout` + screen activa.

No debe contener mocks grandes, JSX de pantallas completas ni reglas extensas de negocio.

## Feedback de acciones

Toda accion asincronica iniciada por el usuario debe tener feedback visible:

- spinner dentro del boton mientras la accion esta en curso;
- boton deshabilitado para evitar doble envio;
- toast de exito, error o informacion al finalizar;
- estado textual de pantalla cuando aporte contexto persistente.

El patron actual usa:

- `LoadingSpinner` para indicadores dentro de botones;
- `useToast` para administrar notificaciones;
- `ToastViewport` para mostrar notificaciones globales.
