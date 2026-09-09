# Estrategia web y mobile

## Acuerdo principal

La aplicacion no debe tratar web y mobile como copias exactas.

Cada entorno tiene un rol propio:

- Web: planificacion, administracion, configuracion, usuarios, analisis, auditoria y trabajo comodo de escritorio.
- Mobile: funcionalidades operativas propias de Agro App y funcionalidades de campo similares a SIMA, con captura rapida, georreferenciacion, imagenes, recorridas y uso offline.

Para el MVP, mobile debe priorizar el dia a dia operativo del campo. Web debe priorizar la preparacion, configuracion y seguimiento de esa operacion.

## Rol de web

Web es el entorno principal para tareas que requieren pantalla amplia, revision o configuracion.

Funciones esperadas:

- planificacion agricola y escenarios;
- configuracion de integracion ERP;
- seleccion de empresas ERP asociadas a AGRO;
- usuarios, roles, permisos y asignacion de campos;
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
- consultar ficha operativa de lote/cultivo;
- consultar planificacion, protocolo y supuestos relevantes del lote cuando aporte contexto operativo;
- cargar precipitaciones por campo asignado y, cuando corresponda, asociarlas a lote;
- cargar observaciones tecnicas;
- agregar comentarios;
- subir imagenes de cultivos, enfermedades, plagas, malezas, danos u otros hallazgos;
- registrar ubicacion GPS de la observacion;
- consultar historial del lote;
- trabajar con sincronizacion posterior cuando haya escenarios offline o conectividad limitada.

Mobile no debe intentar replicar pantallas de administracion o planillas complejas de web.

Para el MVP, cuando se tome una funcionalidad de referencia de SIMA, debe adaptarse al foco operativo de Agro App. Ejemplos validos: recorridas, observaciones georreferenciadas, fotos, precipitaciones, monitoreo de adversidades, ficha de lote/cultivo e historial operativo. Quedan fuera del foco mobile inicial las altas masivas, configuraciones administrativas, planillas economicas extensas y parametrizaciones maestras.

## Relacion entre ambos entornos

Mobile genera datos operativos de campo.

Web consulta, analiza, administra y eventualmente corrige esos datos.

La informacion generada en mobile debe poder verse en web, incluyendo:

- observaciones por campo, lote, cultivo y campania;
- precipitaciones por campo, lote opcional, fecha y usuario;
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

Web first para planificacion, parametrizacion, usuarios, permisos, integraciones, padrones maestros, precios, gastos, protocolos y cierres/aprobaciones.

Esto significa que una funcionalidad puede existir en ambos entornos si tiene sentido para la experiencia de usuario, pero la interfaz y el flujo deben adaptarse al contexto.

Ejemplos:

- Una observacion rapida con foto nace naturalmente en mobile.
- Una precipitacion cargada desde el campo nace naturalmente en mobile y puede revisarse luego desde web.
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

Las precipitaciones deben validarse contra el alcance del usuario. Un usuario comun solo puede registrar lluvia sobre campos asignados; si selecciona lote, ese lote debe pertenecer al campo permitido. El valor debe guardarse con unidad normalizada en milimetros (`mm`), fecha/hora del evento, fecha/hora de carga, origen y usuario.

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
5. Carga rapida de precipitacion por campo asignado, con lote opcional.
6. Historial de observaciones y precipitaciones por campo/lote.
7. Consulta de planificacion/protocolo/supuestos relevantes del lote.
8. Vista web para consultar observaciones y precipitaciones cargadas desde mobile.

La primera version mobile puede guardar precipitaciones como pendientes locales cuando se usa modo demo o no hay conectividad. Con una sesion real, el mismo contrato envia el registro a `POST /precipitaciones`; si falla el envio, debe quedar pendiente para sincronizacion posterior.

La planificacion agricola y los protocolos quedan como funcionalidades principalmente web, con consulta resumida en mobile cuando aporte valor al usuario operativo.
