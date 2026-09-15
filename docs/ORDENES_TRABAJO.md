# Ordenes de trabajo e integracion ALBOR

Este documento define el contrato inicial para ordenes de trabajo de Agro App.

El objetivo del MVP extendido es poder simular y revisar ordenes generadas desde planificacion/protocolos. El envio real a ALBOR queda bloqueado hasta validar endpoints, reglas contables y reglas operativas con datos reales.

## Alcance

Tipos de orden previstos:

- aplicacion;
- siembra;
- fertilizacion;
- cosecha;
- laboreo.

Estados:

- `borrador`: orden editable, no aprobada;
- `aprobada`: orden validada por usuario autorizado, lista para envio futuro;
- `enviada`: enviada a ALBOR;
- `error_envio`: intento de envio fallido, con detalle de error;
- `confirmada`: ALBOR confirmo o devolvio identificador final;
- `cancelada`: orden anulada en Agro App antes de completarse.

Semaforo de integracion:

- `gris`: no evaluada o sin intento de integracion;
- `verde`: cumple validaciones minimas para envio futuro;
- `amarillo`: tiene advertencias, pero podria aprobarse;
- `rojo`: tiene validaciones bloqueantes.

## Origen de una orden

Una orden puede originarse desde:

- `planificacion`: se arma desde una o mas lineas planificadas;
- `protocolo`: se arma desde una etapa o conjunto de etapas de un protocolo;
- `manual`: carga web directa;
- `mobile`: carga operativa limitada desde campo.

Para MVP extendido, el primer flujo recomendado es:

1. elegir una planificacion cerrada o en revision;
2. seleccionar lineas compatibles;
3. elegir tipo de orden;
4. simular cabecera, lotes, labores e insumos;
5. mostrar validaciones y semaforo;
6. guardar como borrador o aprobar;
7. no enviar a ALBOR todavia.

## Datos principales

Cabecera:

- cliente;
- empresa ALBOR;
- tipo;
- estado;
- campania;
- actividad;
- fecha programada;
- origen;
- planificacion/protocolo de origen cuando corresponda;
- responsable;
- observaciones;
- identificador ALBOR futuro.

Lotes:

- campo Agro App y campo ERP si existe;
- lote Agro App y lote ERP si existe;
- superficie incluida.

Labores:

- servicio Agro App y servicio ERP si existe;
- nombre congelado;
- unidad;
- cantidad por hectarea;
- costo unitario opcional.

Insumos:

- insumo Agro App y ERP si existe;
- nombre congelado;
- unidad;
- dosis por hectarea;
- deposito ERP futuro;
- observaciones.

## Reglas de validacion iniciales

Bloqueantes:

- una orden no puede mezclar campanias;
- una orden de siembra no puede mezclar actividades/cultivos distintos;
- todos los lotes deben pertenecer a la misma empresa ALBOR;
- debe existir al menos un lote;
- debe existir al menos una labor;
- debe existir al menos un insumo, excepto en cosecha cuando el proceso no lo requiera;
- para enviar a ALBOR, los lotes deben tener `loteErpId`;
- para enviar a ALBOR, las labores deben tener `servicioErpId`;
- para enviar a ALBOR, los insumos deben tener `insumoErpId`;
- la superficie de cada lote debe ser mayor a cero y no superar la superficie total del lote.

Advertencias:

- faltan costos unitarios en labores;
- faltan precios/costos de insumos;
- la fecha programada esta vacia;
- existen padrones provisorios que permiten operar en Agro App, pero no enviar a ALBOR;
- hay diferencias entre actividad de planificacion y actividad ERP vinculada.

## Permisos propuestos

- `ordenes:leer`: consultar ordenes;
- `ordenes:crear`: crear borradores;
- `ordenes:aprobar`: aprobar ordenes;
- `ordenes:enviar_albor`: intentar envio a ALBOR cuando exista integracion real;
- `ordenes:cancelar`: cancelar borradores o aprobadas no enviadas.

Para MVP, `admin` y `planificador` deberian poder crear y aprobar. `operador_campo` podria crear borradores mobile limitados, sujetos a revision web.

## Integracion ALBOR

El envio a ALBOR queda fuera del MVP inicial.

Antes de habilitarlo se debe validar:

- endpoint exacto de alta de orden;
- payload esperado por tipo;
- reglas de stock/deposito;
- reglas de contratista/maquinaria si aplican;
- comportamiento ante errores parciales;
- si ALBOR recibe orden como pendiente, en ejecucion u otro estado;
- mapeo de identificador devuelto por ALBOR;
- politica de reintentos e idempotencia.

## Contrato compartido

Los tipos iniciales viven en `packages/tipos/src/ordenTrabajo.ts`.

La primera implementacion backend sugerida debe exponer:

- `POST /ordenes/simular`;
- `GET /ordenes`;
- `POST /ordenes`;
- `POST /ordenes/:id/aprobar`;
- `POST /ordenes/:id/cancelar`;
- `POST /ordenes/:id/enviar-albor` bloqueado por feature flag hasta validar integracion.

Toda accion debe auditar usuario, fecha, origen, estado anterior, estado nuevo, cambios relevantes y motivo cuando corresponda.
