# Auditoria

## Premisa

Toda edicion de datos realizada por un usuario debe quedar registrada para poder auditar quien cambio que, cuando lo cambio y desde donde se ejecuto el cambio.

La auditoria es transversal: no aplica solo a administracion, tambien a planificacion agricola, protocolos, asignaciones de campos, empresas ERP, configuracion de integraciones y futuras cargas operativas.

## Alcance

Deben auditarse como minimo:

- altas;
- modificaciones;
- bajas logicas;
- cambios de estado;
- aprobaciones;
- asignaciones y desasignaciones;
- cambios de configuracion;
- cambios economicos sensibles.

## Datos minimos del registro

Cada evento de auditoria debe guardar:

- `clienteId`
- `usuarioId`
- `usuarioEmail`
- `accion`
- `entidad`
- `entidadId`
- `fechaHora`
- `valoresAntes`
- `valoresDespues`
- `origen`
- `ip`
- `userAgent`
- `requestId`

Acciones sugeridas:

- `crear`
- `actualizar`
- `eliminar`
- `activar`
- `desactivar`
- `aprobar`
- `rechazar`
- `asignar`
- `desasignar`
- `sincronizar`
- `cerrar`
- `bloquear_edicion`

Origen sugerido:

- `web`
- `mobile`
- `api`
- `sync_erp`
- `sistema`

## Reglas

- La auditoria debe escribirse desde backend, nunca confiar solo en el frontend.
- Los registros de auditoria no deben poder editarse desde la aplicacion.
- Si una operacion de negocio se confirma, su auditoria debe quedar registrada en la misma transaccion cuando sea posible.
- Si se rechaza una modificacion sobre una planificacion cerrada, puede registrarse un evento de seguridad `bloquear_edicion` cuando el intento sea relevante.
- Si se guarda informacion sensible, se debe evitar exponer secretos completos en `valoresAntes` o `valoresDespues`.
- En cambios de secretos, se audita que el secreto fue actualizado, pero no el valor del secreto.
- En operaciones masivas, debe registrarse un resumen y, si corresponde, detalle por entidad afectada.

## Entidades prioritarias

Primera etapa:

- `IntegracionErp`
- `ClienteEmpresaErp`
- `UsuarioCampoErp`
- `PlanificacionAgricola`
- `PlanificacionAgricolaLinea`
- `ZonaApp`
- `CampoApp`
- `LoteApp`
- `EspecieApp`
- `ActividadApp`
- `InsumoApp`
- `ProtocoloProductivo`
- `ProtocoloEtapa`
- `ProtocoloLabor`
- `ProtocoloInsumo`
- `PrecioApp`
- `DestinoApp`
- `GastosComercialesReferencia`

Segunda etapa:

- registros operativos mobile;
- sincronizaciones offline;
- cambios de estado de labores/cosecha/monitoreo;
- exportaciones o envios al ERP.

## Seguridad

- Solo usuarios autorizados deben poder consultar auditoria.
- El acceso a auditoria debe estar protegido por permiso especifico futuro, por ejemplo `auditoria:leer`.
- Los logs deben poder filtrarse por cliente, usuario, entidad, accion y rango de fechas.
- La auditoria debe respetar multi-cliente: ningun cliente debe poder ver eventos de otro cliente.

## Implementacion actual

- La tabla Prisma se llama `AuditoriaEvento`.
- Protocolos productivos registran auditoria al crear, actualizar y copiar.
- Planificaciones agricolas registran auditoria al crear, actualizar, cerrar y bloquear intentos de edicion sobre planificaciones cerradas.
- La escritura de auditoria se hace desde backend y dentro de la misma transaccion cuando acompania una operacion critica.
- Existe helper backend compartido para registrar eventos de planificacion.
- Existe permiso `auditoria:leer`, asignado al rol `admin`.
- Existe endpoint backend `GET /auditoria`, protegido por autenticacion y permiso `auditoria:leer`.
- Existe pantalla web `Auditoria` para rol admin, con listado de eventos, filtros simples por entidad/accion/limite y detalle de valores antes/despues/metadata.

## Pendientes de implementacion

- Incorporar middleware o wrapper transaccional para rutas criticas.
- Definir retencion de logs.
- Capturar `ip`, `userAgent` y `requestId` desde middleware HTTP.
- Extender el helper a integracion ERP, asignaciones y configuracion.
