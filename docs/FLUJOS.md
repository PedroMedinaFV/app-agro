# Flujos

## Login demo

El login demo permite validar pantallas y navegacion sin depender de PostgreSQL, Microsoft Entra ID o permisos de administrador.

### Web

1. El usuario abre `apps/web`.
2. Presiona `Entrar en modo demo`.
3. La web intenta llamar a `POST /auth/demo`.
4. Si la API responde, guarda la sesion devuelta.
5. Si la API no esta disponible, crea una sesion local de respaldo y muestra un aviso.

### Mobile

1. El usuario abre la app Expo.
2. Presiona `Entrar en modo demo`.
3. La app crea una sesion local usando el mismo contrato `SesionUsuario`.

### Backend

`POST /auth/demo` devuelve un JWT interno y un usuario demo. Este endpoint no consulta la base de datos para que el desarrollo no quede bloqueado cuando PostgreSQL no esta disponible.

## Importacion ERP mock

1. Backend expone `GET /erp/snapshot` con datos mock de campos, lotes, actividades, especies, campañas, cultivos, insumos y empresas.
2. Web consume ese snapshot para alimentar el dashboard.
3. Si la API no esta disponible, web usa un snapshot local minimo.
4. Cuando PostgreSQL este disponible, `POST /erp/sincronizar` persiste el snapshot en tablas `Erp*`.

## Roles demo

1. En desarrollo, el usuario puede ingresar con modo demo.
2. `POST /auth/demo` devuelve una sesion con permisos segun rol.
3. La web manda el token al consultar `/erp/snapshot`.
4. El backend valida el JWT y aplica permisos.
5. Las secciones administrativas aparecen segun permisos, no solo por nombre de rol.

## Asignacion de campos por usuario

1. Un admin asigna campos ERP a un operador de campo.
2. El backend guarda las asignaciones en `UsuarioCampoErp`.
3. Cada campo ERP ya contiene `empresaErpId`, por lo que la empresa queda asociada de forma implicita al campo.
4. Cuando el usuario consulta `GET /erp/snapshot`, el backend filtra campos, lotes y datos operativos relacionados.
5. El usuario solo ve y trabaja sobre sus campos asignados.
6. Si el usuario tiene campos asignados de mas de una empresa AGRO, puede trabajar sobre esos campos aunque provengan de distintas empresas ERP.
7. Si una empresa AGRO no tiene campos asignados al usuario, el usuario no ve datos operativos de esa empresa.

## Inicio de operador de campo

1. El usuario inicia sesion con Microsoft Entra ID o, durante desarrollo, con modo demo.
2. Backend valida la sesion y devuelve permisos de `operador_campo`.
3. La app web/mobile solicita el snapshot operativo con el token del usuario.
4. Backend identifica el `clienteId` y las asignaciones en `UsuarioCampoErp`.
5. Backend filtra la informacion antes de responder:
   - Campos: solo `campoErpId` asignados al usuario.
   - Lotes: solo lotes cuyo `campoErpId` pertenece a un campo asignado.
   - Cultivos: solo cultivos cuyo `loteErpId` pertenece a un lote permitido.
   - Insumos: insumos de referencia recortados por empresas derivadas de los campos asignados.
   - Actividades/registros operativos futuros: solo datos relacionados con los lotes permitidos.
   - Padrones maestros necesarios para operar, como especies y campañas: recortados por empresas derivadas de los campos asignados cuando aplique.
6. La app muestra un inicio operativo orientado al trabajo del usuario:
   - campos asignados;
   - lotes disponibles;
   - cultivos disponibles;
   - campaña actual;
   - pendientes o acciones de carga;
   - estado de sincronizacion.
7. El operador no ve pantallas administrativas como `Empresas ERP`, configuracion de integracion ni asignacion de campos.

La empresa ERP no se asigna directamente al operador. Se deriva desde los campos asignados mediante `empresaErpId`. Esto permite que trabaje en campos puntuales sin darle acceso completo a toda una empresa.

### Estado implementado

- Backend: `GET /erp/snapshot` filtra campos, lotes, empresas, zonas, especies y actividades por las empresas derivadas de los campos asignados.
- Web: el rol `operador_campo` ve un inicio `Mi trabajo` con foco en sus campos, lotes y acciones permitidas.
- Mobile: el rol `operador_campo` ve una version demo de `Mi trabajo` con campos/lotes asignados y accion operativa permitida.

## Empresas ERP para AGRO

1. El backend consulta `Sistema/Empresas` para obtener el padron completo de empresas del ERP.
2. En web, el admin abre `Empresas ERP`.
3. La pantalla lista las empresas disponibles e informa el valor que se usara en el header `x-company`.
4. El admin marca que empresas pertenecen a AGRO.
5. La web intenta guardar la seleccion con `PUT /admin/empresas-erp/:clienteId/empresas`.
6. Si PostgreSQL no esta disponible, la web conserva la seleccion localmente para poder validar la experiencia demo.
7. Cuando se sincronizan padrones operativos, el backend consulta una vez por cada empresa seleccionada enviando `x-company: <idEmpresa>`.
8. Cada dato importado guarda `empresaErpId` para conservar de que empresa ERP proviene.

### Mobile

Mobile debe reflejar la misma regla funcional: usuarios admin pueden ver el resumen de empresas ERP asociadas y, mas adelante, gestionar la seleccion con el mismo backend. En el estado actual se muestra una referencia demo para mantener alineado el flujo web/mobile.

## Planificacion agricola

1. El admin o usuario autorizado selecciona campania.
2. Selecciona campo y lote dentro de su alcance.
3. Define actividad/cultivo planificado.
4. Ingresa supuestos de ingreso: rinde estimado, precio de venta y gastos comerciales.
5. Selecciona un protocolo productivo con descripcion clara.
6. El sistema copia las etapas, labores e insumos del protocolo a la planificacion.
7. El usuario puede ajustar la planificacion por lote sin modificar el protocolo base.
8. El sistema calcula ingreso neto, costo productivo y margen bruto estimado.
9. La web valida la planilla en modo demo consumiendo `GET /planificacion/snapshot`.
10. La web permite editar la planilla como grilla tipo Excel y guardar borrador con `PUT /planificacion/:id`.
11. La web permite seleccionar la campania desde la cabecera de la planificacion.
12. Frontend y backend validan que no se repita la misma actividad para una misma campania, campo y lote.
13. La grilla usa selects dependientes: campo primero y luego lotes filtrados por ese campo.
14. Al agregar una nueva linea, se propone el campo de la linea anterior para reducir carga repetitiva.
15. El destino se selecciona desde una tabla de destinos disponibles.
16. Los gastos comerciales se sugieren desde una tabla configurable por zona/campo/actividad/destino y se copia el total a la linea.
17. El protocolo se filtra por actividad y compatibilidad con zona/campo.
18. Los protocolos compatibles se muestran ordenados por ultima modificacion descendente.
19. Mobile muestra una vista resumida de consulta para mantener paridad funcional inicial.
20. Mobile consulta los supuestos comerciales del lote seleccionado, incluyendo destino, precio, rinde, gastos, protocolo y margen, siempre como solo lectura en el MVP.

Los insumos se integran desde `Padrones/Insumos` como referencia para protocolos. La persistencia real de planificacion queda pendiente hasta tener PostgreSQL disponible.

## Protocolos productivos

1. Un usuario con permiso `planificacion:configurar` ingresa a la pantalla web `Protocolos`.
2. La web muestra una grilla de protocolos para comparar nombre, actividad, campo, costo y fecha de actualizacion.
3. El usuario selecciona un protocolo existente, crea uno nuevo o copia uno existente.
4. Si copia un protocolo, el sistema crea una entidad nueva con `protocoloOrigenId` y la selecciona para editar.
5. Define cabecera: nombre, descripcion, actividad, zona opcional y campo opcional.
6. Carga etapas del cultivo en orden productivo.
7. En cada etapa carga labores con unidad, cantidad y costo estimado.
8. En cada etapa carga insumos con referencia al padron de insumos cuando exista, dosis y precio estimado.
9. El sistema recalcula el costo por hectarea del protocolo.
10. El usuario guarda el protocolo con `PUT /planificacion/protocolos/:id` en modo demo.
11. El backend valida permisos, cliente y alcance del usuario antes de persistir.
12. El backend registra auditoria completa de cambios de cabecera, etapas, labores, insumos, costos y copias.
13. Mobile muestra el protocolo asociado como consulta/resumen, dejando la edicion avanzada para web.

En modo demo, el backend guarda en memoria para validar UX y contratos. En persistencia real, el guardado debe ser transaccional para evitar protocolos parcialmente actualizados.

## Observaciones de campo mobile-web

1. El usuario operativo inicia sesion desde mobile.
2. Backend devuelve campos y lotes asignados segun permisos y alcance.
3. Mobile muestra los lotes en listado y, cuando exista georreferenciacion, en mapa.
4. El usuario selecciona un lote/cultivo.
5. Mobile permite cargar una observacion con:
   - titulo;
   - descripcion/comentario;
   - severidad;
   - ubicacion GPS opcional;
   - adjuntos/fotos mediante URL firmada de Supabase Storage;
   - fecha/hora;
   - estado fenologico cuando aplique en una etapa posterior.
6. Mobile solicita al backend una URL firmada para subir la foto.
7. Mobile sube el binario directamente a Supabase Storage con URL temporal.
8. Mobile envia la observacion al backend con origen `mobile` y metadata del adjunto.
9. Backend valida autenticacion, permisos, alcance sobre el lote y metadata del adjunto.
10. Backend persiste la observacion, la metadata del adjunto y auditoria.
11. Web permite consultar la informacion generada en mobile por campo, lote, cultivo, campania, usuario, fecha y tipo.
12. Web puede abrir adjuntos mediante URL firmada de lectura de corta duracion.

La captura nace naturalmente en mobile, pero la consulta, analisis y revision pueden realizarse desde web.

Endpoints iniciales:

- `GET /observaciones`: lista las ultimas observaciones del cliente, filtradas por alcance de campos para operador de campo.
- `POST /observaciones`: crea una observacion con campo obligatorio, lote opcional, titulo, descripcion, severidad, coordenadas opcionales, fecha/hora del evento y origen.
- `POST /observaciones/adjuntos/upload-url`: genera una URL firmada temporal para subir una foto validada.
- `POST /observaciones/adjuntos/:id/signed-url`: genera una URL firmada temporal para leer un adjunto persistido.
- `POST /sincronizacion`: procesa pendientes offline. En MVP acepta `tipo = precipitacion` y `tipo = observacion`.

Validaciones iniciales:

- titulo y descripcion son obligatorios;
- severidad debe ser `baja`, `media` o `alta`;
- si se informa ubicacion, latitud y longitud deben venir juntas y dentro de rango valido;
- el campo debe pertenecer al cliente de la sesion;
- si se informa lote, debe pertenecer al campo seleccionado;
- un operador de campo solo puede cargar o ver observaciones de campos asignados;
- los adjuntos no viajan como binario en el JSON; se persiste solo metadata de storage;
- los adjuntos se validan por cantidad, tamano, MIME, ruta segura, estado y checksum opcional;
- toda alta registra auditoria;
- `registroMovilId` es unico por cliente cuando existe, para evitar duplicados por reintentos offline.

Offline de fotos:

- si la observacion se guarda sin conexion, mobile conserva la referencia local del archivo junto al registro pendiente;
- al sincronizar, mobile sube primero la foto a Supabase Storage con URL firmada;
- luego envia la observacion con metadata del adjunto ya subido;
- si falla la subida o la persistencia, el registro sigue pendiente.

Pendiente de hardening mobile:

- guardar una copia persistente del archivo dentro del sandbox de la app para no depender de URIs temporales del sistema operativo;
- reintentar adjuntos individualmente y mostrar detalle por foto pendiente.

## Precipitaciones por campo asignado

1. El usuario operativo inicia sesion desde mobile.
2. Backend devuelve campos asignados y sus lotes permitidos.
3. Mobile permite cargar una precipitacion rapida desde el campo.
4. El usuario selecciona campo asignado; el lote es opcional y solo puede elegirse entre lotes del campo seleccionado.
5. El usuario informa milimetros, fecha/hora del evento y observaciones opcionales.
6. Mobile envia la precipitacion al backend con origen `mobile`.
7. Backend valida autenticacion, permisos y alcance sobre el campo/lote.
8. Backend persiste el registro en milimetros (`mm`), con usuario, fecha/hora de carga, origen y auditoria.
9. Web permite consultar precipitaciones por empresa, campo, lote, campania, usuario y rango de fechas.
10. Si mobile trabaja sin conexion, la precipitacion queda pendiente de sincronizacion y se envia cuando vuelva la conectividad.
11. La sincronizacion offline usa `POST /sincronizacion` con token valido y permiso `registros:sincronizar`.
12. Cada registro mobile envia su identificador local como `registroMovilId` para que el backend no duplique la precipitacion ante reintentos.
13. El backend revalida campo, lote, usuario, cliente y permisos antes de persistir cualquier pendiente.

La carga de precipitaciones tambien puede existir en web para correcciones, migracion historica o carga de oficina, pero el flujo principal del MVP operativo debe estar pensado para mobile.

Endpoints iniciales:

- `GET /precipitaciones`: lista las ultimas precipitaciones del cliente, filtradas por alcance de campos para operador de campo.
- `POST /precipitaciones`: crea una precipitacion con campo obligatorio, lote opcional, milimetros, fecha/hora del evento, observaciones y origen.
- `POST /sincronizacion`: procesa pendientes offline. En MVP acepta `tipo = precipitacion` y `tipo = observacion`; otros tipos quedan pendientes con error controlado.

Validaciones iniciales:

- los milimetros deben ser mayores a cero;
- el campo debe pertenecer al cliente de la sesion;
- si se informa lote, debe pertenecer al campo seleccionado;
- un operador de campo solo puede cargar o ver precipitaciones de campos asignados;
- toda alta registra auditoria;
- la sincronizacion offline no confia en el payload mobile y vuelve a ejecutar las mismas validaciones del alta online;
- `registroMovilId` es unico por cliente cuando existe, para evitar duplicados por reintentos.

## Ficha operativa de lote

1. El operador selecciona un campo y lote desde mobile.
2. Mobile consulta `GET /operativo/lotes/:loteAppId/ficha`.
3. Backend valida sesion, `clienteId` y alcance por campos asignados.
4. Backend arma una vista consolidada del lote:
   - campo, lote y zona;
   - cultivos ERP vinculados al lote;
   - lineas de planificacion asociadas;
   - resumen de precipitaciones;
   - resumen de observaciones y adjuntos.
5. Mobile muestra la ficha antes de cargar nuevas observaciones o precipitaciones.
6. Web consume el mismo endpoint desde `Seguimiento operativo`.
7. La pantalla web consolida filtros, ficha de lote, observaciones, fotos y precipitaciones.

Validaciones iniciales:

- el lote debe pertenecer al cliente de la sesion;
- el lote debe pertenecer a un campo permitido para el operador;
- la ficha no devuelve datos de otros clientes;
- la web/mobile no calculan permisos localmente, solo consumen lo que backend ya filtro.

## Seguimiento operativo web

1. El usuario ingresa a `Seguimiento`.
2. La web carga campos/lotes desde `GET /planificacion/snapshot`.
3. La web carga observaciones desde `GET /observaciones`.
4. La web carga precipitaciones desde `GET /precipitaciones`.
5. Al seleccionar lote, la web carga `GET /operativo/lotes/:loteAppId/ficha`.
6. Los filtros iniciales permiten revisar por campo, lote, severidad, fecha y texto.
7. Los adjuntos se abren con URL firmada temporal.

Esta pantalla es de consulta y analisis. Las cargas rapidas siguen estando en `Observaciones`, `Precipitaciones` y mobile.

## Alta de usuarios, rol y enlace Microsoft

1. Un administrador ingresa a la pantalla web `Usuarios`.
2. Crea un usuario con email, nombre y rol inicial.
3. Si el rol es `operador_campo`, asigna los campos ERP permitidos para operar.
4. Backend valida que el usuario pertenezca al cliente de la sesion.
5. Backend valida que los campos asignados pertenezcan al mismo cliente y esten vinculados al ERP.
6. Backend persiste usuario, rol y asignaciones con auditoria.
7. El usuario inicia sesion con Microsoft usando el mismo email.
8. Backend valida el `id_token` con Microsoft y busca/upsertea por email.
9. Si el email ya fue creado por el administrador, se conserva `clienteId`, rol y campos asignados, y se guarda `microsoftId`.
10. La sesion queda enlazada a Microsoft desde ese momento.

Para el MVP no se recomienda autoalta libre por Microsoft. Si un email no fue configurado previamente por un administrador, el sistema puede crearlo como usuario sin cliente o rechazarlo segun la politica final. La opcion mas segura para produccion es exigir prealta administrativa.
