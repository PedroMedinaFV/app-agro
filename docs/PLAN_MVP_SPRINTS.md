# Plan de Sprints para MVP

## Objetivo del MVP

Llegar a una primera version usable de Agro App que permita:

- conectarse con ALBOR Agro;
- importar padrones reales;
- seleccionar empresas AGRO;
- planificar agricola y economicamente una campania;
- administrar precios, destinos, gastos comerciales, labores, insumos y protocolos;
- consultar informacion operativa desde web y mobile;
- dejar base de seguridad, auditoria y multi-cliente.

## Lectura funcional de SIMA

Fuentes publicas revisadas:

- https://sima.ag/es/modulos
- https://help.sima.ag/es/articles/6009570-conocer-que-es-sima
- https://help.sima.ag/es/articles/6059941-integracion-sima-albor-campo
- https://help.sima.ag/es/articles/6025378-planificacion-de-cultivos
- https://help.sima.ag/es/articles/6025382-gestionar-campanas-en-sima
- https://help.sima.ag/es/articles/6025922-monitoreo-de-adversidades
- https://help.sima.ag/es/articles/6115882-reportes
- https://help.sima.ag/es/articles/11592147-reportes-en-sima

### Funcionalidades detectadas en SIMA

SIMA organiza su producto alrededor de:

- configuracion web de cuenta, usuarios, campos, lotes, insumos, contratistas y reportes;
- app mobile como cuaderno de campo, con uso offline y sincronizacion posterior;
- planificacion de cultivos por lote/campania;
- monitoreo/scouting georreferenciado con muestras, adversidades, semaforo, fotos, notas y waypoints;
- ordenes de trabajo para aplicacion, siembra, fertilizacion, cosecha y laboreo;
- seguimiento de siembra y cosecha;
- clima, precipitaciones y eventos climaticos;
- GIS, NDVI, mapas de rinde, prescripciones y zonificacion;
- reportes con filtros, columnas configurables y exportacion;
- etiquetas transversales para clasificar entidades y actividades.

### Integracion SIMA - ALBOR Campo

La integracion publica de SIMA con ALBOR Campo se enfoca en evitar doble carga y usa ALBOR como fuente de padrones para gestionar ordenes de trabajo.

Padrones que SIMA importa desde ALBOR:

- establecimientos;
- lotes;
- campanias/actividades;
- aplicadores;
- maquinas;
- depositos;
- unidades;
- productos.

Flujo observado:

1. Se configuran credenciales de ALBOR.
2. Se selecciona la empresa de ALBOR a vincular.
3. Se crean planificaciones de cultivos en SIMA.
4. Se vinculan cultivos/campanias ALBOR con planificaciones SIMA.
5. Se importan padrones.
6. Se registran ordenes de trabajo en SIMA web o mobile.
7. Las ordenes aprobadas pueden enviarse a ALBOR como pendientes o en ejecucion.

Restricciones importantes de integracion:

- una orden no debe mezclar cultivos de distintas campanias;
- una orden de siembra no debe tener lotes con diferentes cultivos/actividades;
- los items de labor no deben mezclar servicios/contratistas;
- los items de insumo no deben mezclar puntos de stock;
- debe existir al menos una labor;
- debe existir al menos un insumo salvo cosecha;
- cuando hay conflicto, ALBOR domina ciertos datos por ser el sistema de gestion;
- altas, modificaciones y bajas de padrones integrados se gestionan en ALBOR.

### Diferencia estrategica de Agro App

Agro App no debe copiar SIMA uno a uno.

La oportunidad diferencial definida para nuestro MVP es:

- fuerte foco en planificacion economica y margen bruto;
- protocolos productivos con costos por hectarea;
- precios de referencia y gastos comerciales editables;
- posibilidad de crear padrones provisorios para no bloquear la planificacion;
- vinculacion asistida posterior con ALBOR;
- auditoria completa de cambios;
- seguridad multi-cliente desde el inicio.

SIMA, segun la documentacion publica, exige ir a ALBOR si falta un item de padron integrado. Agro App toma otra decision: permite crear datos provisorios operativos y luego vincularlos con ALBOR bajo control de usuario autorizado.

## Criterio de Sprint

Cada sprint debe cerrar una pieza usable, integrada y validable:

1. contrato compartido en `packages/tipos`;
2. persistencia y endpoint en `apps/api`;
3. pantalla web para configuracion/analisis;
4. vista mobile cuando aporte al flujo operativo;
5. auditoria y permisos;
6. documentacion;
7. validacion tecnica.

Premisa visual:

- las pantallas con tablas deben usar un componente compartido de tabla paginada para mantener estructura, estilos, estados vacios y navegacion consistentes;
- las tablas de padrones deben evitar scroll horizontal en uso normal y adaptarse a mobile con filas apiladas;
- los padrones con muchos registros ERP, como insumos, labores, campos y lotes, deben paginar por defecto.
- toda accion web que viaje al backend debe bloquear la pantalla con spinner global hasta recibir respuesta, para evitar dobles envios y estados ambiguos.

## Sprint 0 - Base operativa e integracion ERP

Estado: cerrado para MVP.

Objetivo:

- dejar estable la conexion con Supabase y ALBOR;
- importar empresas reales;
- permitir seleccionar empresas AGRO.

Incluye:

- [x] `DATABASE_URL` Supabase con schema propio;
- [x] `ERP_AUTH_MODE=login`;
- [x] login contra `ERP_AUTH_BASE_URL`;
- [x] importacion de `Sistema/Empresas` a `ErpEmpresa`;
- [x] seleccion AGRO en `ClienteEmpresaErp`;
- [x] pantalla web `Empresas ERP`;
- [x] scripts `erp:test`, `erp:sync:empresas`, `erp:list:empresas`;
- [x] documentacion de integracion y secretos.

Criterio de aceptacion:

- [x] `erp:test` devuelve empresas reales;
- [x] `erp:sync:empresas` guarda empresas en Supabase;
- [x] la web muestra todas las empresas importadas;
- [x] el admin puede guardar seleccion AGRO;
- [x] ningun secreto se muestra en frontend ni queda versionado.

## Sprint 1 - Sincronizacion de padrones base ALBOR

Estado: backend cerrado; web/mobile pendiente.

Objetivo:

- importar los padrones necesarios para planificar y armar protocolos.

Incluye:

- [x] sincronizar por cada empresa AGRO seleccionada usando `x-company`;
- [x] importar zonas, campos, lotes, campanias, actividades, especies, cultivos, insumos, servicios/labores, unidades de medida y puertos;
- [x] registrar conteos e incidencias de sincronizacion;
- [x] evitar que referencias huerfanas rompan toda la corrida;
- [x] accion web admin para sincronizar padrones y ver conteos principales;
- [ ] mobile solo lectura de campos/lotes/cultivos asignados.

Criterio de aceptacion:

- [x] `erp:sync` importa padrones reales de empresas AGRO;
- [x] cada registro conserva `empresaErpId`;
- [x] no se duplican registros en corridas sucesivas;
- [x] la web permite disparar sincronizacion manual y ver conteos principales;
- [ ] la web muestra historial de corridas y errores por empresa/padron;
- [ ] usuario comun solo ve campos asignados.

Decision de alcance:

- La sincronizacion web queda sincrona para MVP temprano.
- El job persistido con `syncId`, polling, historial, errores por empresa/padron y bloqueo por base de datos queda planteado para hardening antes de produccion.

Validacion realizada:

- `db:clean:dev` limpio datos operativos/cache de desarrollo preservando cliente, usuario, configuracion ERP, empresas ERP y seleccion AGRO;
- `erp:sync -- --clienteId=cliente-demo` importo datos reales para `empresa:1`, `empresa:3`, `empresa:18` y `empresa:19`;
- conteos filtrados por empresas AGRO: 6 zonas, 25 campos, 847 lotes, 72 actividades, 46 especies, 16 campanias, 3267 cultivos, 991 insumos, 147 servicios/labores, 18 unidades de medida y puertos segun ERP;
- `Padrones/Zonas`, `Agricultura/Actividades`, `Agricultura/Especies`, `Agricultura/Campanias`, `Padrones/Insumos`, `Padrones/Servicios`, `Padrones/UnidadesMedida` y `Padrones/Puertos` se deduplican como padrones globales porque ALBOR devuelve el mismo catalogo para cualquier `x-company`;
- `erp:verify` confirma `ultimoSyncEn` en `IntegracionErp`;
- las tablas `Erp*` se refrescan como cache por empresa y las ediciones de usuario quedan fuera de esa cache.
- [x] los campos provisorios se pueden vincular manualmente contra campos ERP disponibles; la accion queda auditada, valida empresa/zona y evita duplicados por cliente.

## Sprint 2 - Padrones propios y vinculacion futura

Estado: iniciado.

Objetivo:

- permitir operar aunque algun padron aun no exista en ALBOR.

Incluye:

- [x] pantallas web de padrones propios: zonas, campos, lotes, especies, actividades, insumos y labores;
- [x] pantalla web inicial de zonas con ERP sincronizado y zonas propias;
- [x] pantalla web inicial de especies con ERP sincronizado y especies propias;
- [x] pantalla web inicial de actividades con ERP sincronizado y actividades propias;
- [x] pantalla web inicial de campos con ERP sincronizado y campos propios;
- [x] pantalla web inicial de lotes con ERP sincronizado y lotes propios;
- [x] pantalla web de insumos con ERP sincronizado y propios Agro App;
- [x] pantalla web de labores con ERP sincronizado y propias Agro App;
- [x] alta provisoria de zonas globales del cliente;
- [x] alta provisoria de especies globales del cliente;
- [x] alta provisoria de actividades globales asociadas a especie;
- [x] alta provisoria de campos;
- [x] alta provisoria de lotes asociados a campos propios;
- [x] alta provisoria de insumos;
- [x] alta provisoria de labores;
- [x] seleccion de zona desde zonas ERP sincronizadas o zonas propias de Agro App;
- [x] estado de vinculacion: `provisorio`, `vinculado_erp`, `archivado`;
- [x] vinculacion manual inicial de zonas, campos, lotes, especies, actividades, insumos y labores provisorios contra ERP disponible;
- [x] pantalla web transversal para revisar, editar y desvincular vinculaciones ERP;
- [x] sugerencias visuales iniciales de vinculacion por codigo/nombre normalizado;
- [x] bloqueo global con spinner para llamadas web al backend;
- [x] notificaciones internas persistidas para revisar coincidencias;
- [x] auditoria de altas y ediciones de zonas;
- [x] auditoria de altas y ediciones de especies;
- [x] auditoria de altas y ediciones de actividades;
- [x] auditoria de altas y ediciones de campos;
- [x] auditoria de altas y ediciones de lotes;
- [x] auditoria de altas y ediciones de insumos;
- [x] auditoria de altas y ediciones de labores;
- [x] auditoria de vinculacion manual de zonas, campos, lotes, especies, actividades, insumos y labores;
- [x] auditoria de edicion y desvinculacion manual de vinculaciones ERP;
- [ ] auditoria de vinculaciones sugeridas;
- mobile lectura de padrones asignados.

Criterio de aceptacion:

- [x] se puede crear una zona/campo/lote/especie/actividad/insumo/labor provisoria;
- [x] se puede crear y editar una zona provisoria;
- [x] se puede crear y editar una especie provisoria;
- [x] se puede crear y editar una actividad provisoria;
- [x] se puede crear y editar un campo provisorio;
- [x] se puede crear y editar un lote provisorio;
- [x] se puede crear y editar un insumo provisorio;
- [x] se puede crear y editar una labor provisoria;
- se puede usar en planificacion/protocolos;
- [x] la web propone candidatos al abrir la vinculacion manual;
- [x] una sincronizacion posterior puede generar notificaciones persistidas de vinculacion;
- [x] la vinculacion nunca es automatica en MVP.

## Sprint 3 - Precios, destinos y gastos comerciales

Estado: parcialmente implementado en web/backend.

Objetivo:

- completar los supuestos comerciales reutilizables para margen bruto.

Incluye:

- maestro de destinos de venta;
- precios de referencia transversales, no atados a campania;
- gastos comerciales por campania, actividad, destino y alcance geografico;
- precios y gastos consumen actividades reales desde DB, combinando Agro App y ERP;
- gastos comerciales consumen zonas y campos reales desde DB para definir alcance;
- si se usa una actividad ERP en precios/gastos, se crea automaticamente una actividad operativa vinculada y auditada;
- conceptos comerciales maestros;
- normalizacion en backend para evitar duplicados;
- auditoria real de cambios;
- mobile solo consulta de supuestos relevantes por lote/cultivo.

Criterio de aceptacion:

- se puede crear/editar precio desde modal;
- se puede crear destino si no existe;
- destino es unico por nombre normalizado y cliente;
- gastos comerciales se calculan por tonelada;
- la planificacion puede consumir precio y gasto sugerido.

## Sprint 4 - Protocolos productivos

Estado: parcialmente implementado.

Objetivo:

- administrar protocolos productivos reutilizables para calcular costos.

Incluye:

- listado principal de protocolos;
- crear, editar y copiar protocolo;
- cabecera con campania, actividad, zona/campo opcional, descripcion y tipo de fecha;
- etapas basadas en maestro de estadios;
- labores e insumos seleccionados desde padrones;
- indice de aplicacion entre 0 y 1;
- costos por hectarea;
- fechas absolutas o relativas a siembra;
- auditoria de creacion, edicion y copia;
- mobile consulta/resumen de protocolo asignado.

Criterio de aceptacion:

- un protocolo calcula costo productivo por hectarea;
- copiar protocolo no modifica el original;
- los insumos/labores copiados quedan congelados como supuesto editable;
- protocolo requiere permiso de configuracion para modificar.

## Sprint 5 - Planificacion agricola tipo planilla

Objetivo:

- cerrar la funcionalidad central del MVP.

Incluye:

- listado de planificaciones con nombre, campania, estado, hectareas y margen;
- pantalla completa de edicion tipo planilla;
- lineas por campo, lote, actividad y protocolo;
- selects dependientes campo/lote;
- propuesta automatica de destino, precio y gastos;
- carga de rinde estimado y hectareas;
- calculo de ingreso bruto, ingreso neto, costo productivo y margen bruto;
- validacion de duplicados por campania/campo/lote/actividad;
- guardado borrador;
- cierre de planificacion;
- auditoria de cambios e intentos bloqueados;
- mobile consulta de planificacion asignada.

Criterio de aceptacion:

- se puede crear una planificacion completa;
- no permite duplicar misma actividad en el mismo lote/campania;
- una planificacion cerrada no se puede editar;
- el margen queda calculado y visible;
- todos los cambios relevantes quedan auditados.

## Sprint 6 - Mobile operativo V1

Objetivo:

- iniciar la experiencia mobile de campo, sin replicar toda la web.

Incluye:

- login y sesion;
- lista de campos/lotes asignados;
- vista geografica simple o preparacion de modelo georreferenciado;
- ficha de lote/cultivo;
- carga de observacion;
- foto adjunta;
- comentario;
- estado offline pendiente de sincronizar;
- consulta de protocolo o planificacion asociada.

Criterio de aceptacion:

- usuario comun ve solo sus campos;
- puede crear una observacion de lote;
- puede adjuntar imagen;
- si no hay conexion, queda pendiente;
- al sincronizar, web puede ver esa informacion.

## Sprint 7 - Web de seguimiento operativo

Objetivo:

- que la web vea la informacion generada por mobile.

Incluye:

- tablero de observaciones;
- filtros por empresa, campo, lote, campania, actividad, usuario y fecha;
- detalle con imagenes, comentarios y georreferencia;
- exportacion inicial;
- auditoria y permisos de lectura;
- base para futuros reportes tipo SIMA.

Criterio de aceptacion:

- una observacion cargada en mobile aparece en web;
- puede filtrarse y revisarse;
- conserva usuario, fecha, campo/lote y adjuntos;
- no expone datos fuera del cliente/campos permitidos.

## Sprint 8 - Ordenes de trabajo e integracion ALBOR futura

Objetivo:

- disenar, no necesariamente completar, el puente hacia ordenes de trabajo.

Incluye:

- modelo preliminar de ordenes de aplicacion, siembra, fertilizacion, cosecha y laboreo;
- reglas de validacion inspiradas en SIMA/ALBOR;
- estados: borrador, aprobada, enviada, error_envio, confirmada;
- semaforo de integracion;
- pantalla web de revision y envio;
- mobile alta operativa limitada;
- bitacora de errores de envio.

Criterio de aceptacion MVP extendido:

- queda documentado el contrato;
- se puede simular una orden desde planificacion/protocolo;
- no se envia a ALBOR hasta validar endpoint real y reglas contables/operativas.

## Fuera del MVP inicial

Quedan para version posterior:

- NDVI e imagenes satelitales;
- prescripciones;
- mapas de rinde;
- clima por WhatsApp;
- sensores remotos;
- reportes BI avanzados;
- ordenes de trabajo enviadas definitivamente a ALBOR;
- confirmaciones de ejecucion;
- integraciones con maquinaria o terceros.

## Riesgos principales

- Volumen y tiempos de sincronizacion por empresa.
- Sincronizacion ERP sin job persistido todavia no sobrevive refrescos de navegador ni multiples instancias backend.
- Diferencias de padrones entre empresas ALBOR.
- Datos faltantes o inconsistentes en ALBOR.
- Seguridad de secretos ERP y tokens.
- Reglas de permisos por usuario/campo.
- Auditoria incompleta en operaciones economicas.
- UX de planilla demasiado densa.
- Offline mobile con conflictos de sincronizacion.

## Proximo paso recomendado

Cerrar Sprint 1:

1. seleccionar empresas AGRO desde la web;
2. correr `erp:sync` solo para esas empresas;
3. validar conteos por padron;
4. crear una pantalla de estado de sincronizacion;
5. comenzar a poblar padrones propios vinculados a ERP para que planificacion use datos reales.
