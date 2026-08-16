# Estrategia web y mobile

## Acuerdo principal

La aplicacion no debe tratar web y mobile como copias exactas.

Cada entorno tiene un rol propio:

- Web: administracion, configuracion, planificacion, analisis, auditoria y trabajo comodo de escritorio.
- Mobile: operacion diaria en campo, captura rapida de datos, georreferenciacion, imagenes y recorridas.

## Rol de web

Web es el entorno principal para tareas que requieren pantalla amplia, revision o configuracion.

Funciones esperadas:

- configuracion de integracion ERP;
- seleccion de empresas ERP asociadas a AGRO;
- usuarios, roles, permisos y asignacion de campos;
- planificacion agricola;
- protocolos productivos;
- precios, destinos de venta y gastos comerciales;
- consulta y analisis de informacion generada en mobile;
- reportes;
- auditoria;
- revision y correccion de datos segun permisos.

Web tambien puede permitir carga operativa cuando aporte comodidad al usuario, por ejemplo observaciones largas, informes tecnicos, revisiones historicas o correcciones.

## Rol de mobile

Mobile esta orientado al trabajo operativo de campo.

Usuarios principales:

- personas que recorren lotes;
- ingenieros agronomos;
- responsables operativos que registran informacion en terreno.

Funciones esperadas:

- ver campos y lotes asignados;
- visualizar lotes mediante georreferenciacion geografica;
- seleccionar lotes desde mapa o listado;
- registrar recorridas;
- cargar observaciones tecnicas;
- agregar comentarios;
- subir imagenes de cultivos, enfermedades, plagas, malezas, danos u otros hallazgos;
- registrar ubicacion GPS de la observacion;
- consultar historial del lote;
- trabajar con sincronizacion posterior cuando haya escenarios offline o conectividad limitada.

Mobile no debe intentar replicar pantallas de administracion o planillas complejas de web.

## Relacion entre ambos entornos

Mobile genera datos operativos de campo.

Web consulta, analiza, administra y eventualmente corrige esos datos.

La informacion generada en mobile debe poder verse en web, incluyendo:

- observaciones por campo, lote, cultivo y campania;
- fotos;
- comentarios;
- historial de recorridas;
- ubicacion/georreferencia de cada observacion;
- usuario que cargo el dato;
- fecha y hora;
- tipo de observacion;
- estado fenologico informado;
- alertas o hallazgos relevantes;
- auditoria de altas, ediciones y eliminaciones logicas.

## Regla de producto

Mobile first para captura en campo.

Web disponible cuando aporte comodidad, revision, analisis o control.

Esto significa que una funcionalidad puede existir en ambos entornos si tiene sentido para la experiencia de usuario, pero la interfaz y el flujo deben adaptarse al contexto.

Ejemplos:

- Una observacion rapida con foto nace naturalmente en mobile.
- Un informe tecnico extenso puede cargarse o completarse mejor desde web.
- Una observacion cargada en mobile puede revisarse, clasificar fotos o corregirse desde web si el usuario tiene permisos.
- Una recorrida historica puede cargarse desde web si se esta migrando informacion previa.

## Implicancias tecnicas

Los datos operativos generados en mobile deben persistirse en backend y estar disponibles para web.

Toda carga o edicion debe respetar:

- autenticacion;
- permisos;
- alcance por campos/lotes asignados;
- auditoria;
- trazabilidad de usuario, fecha, origen y cambios;
- eventual sincronizacion offline/mobile cuando se implemente.

El campo `origen` de las operaciones debe distinguir al menos:

- `web`;
- `mobile`;
- `api`.

## MVP sugerido para modulo operativo mobile

Primer alcance recomendado:

1. Inicio operativo con campos/lotes asignados.
2. Mapa o vista georreferenciada de lotes.
3. Detalle de lote/cultivo.
4. Nueva observacion con comentario, tipo, fecha, ubicacion y fotos.
5. Historial de observaciones por lote.
6. Vista web para consultar observaciones cargadas desde mobile.

La planificacion agricola y los protocolos quedan como funcionalidades principalmente web, con consulta resumida en mobile cuando aporte valor al usuario operativo.
