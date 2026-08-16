# Seguridad

## Principios

La seguridad es una premisa transversal del proyecto. Cada funcionalidad nueva debe revisarse considerando autenticacion, autorizacion, manejo de secretos, minimizacion de datos, auditoria y resistencia ante errores de integracion.

Toda edicion de datos realizada por un usuario debe quedar registrada para auditoria. Ver `docs/AUDITORIA.md`.

## Autenticacion

- El modo demo existe solo para desarrollo y validacion temprana.
- La autenticacion final debe integrarse con Microsoft Entra ID.
- Los endpoints protegidos deben requerir token valido.
- Los tokens deben tener expiracion y no deben guardarse en lugares inseguros del cliente.

## Autorizacion

- Los roles iniciales son `admin` y `usuario`.
- Las rutas no deben depender solamente de comparar roles; deben usar permisos declarativos.
- Toda ruta administrativa debe usar middleware de autenticacion y `requierePermiso`.
- La pantalla web puede ocultar acciones, pero la seguridad real debe aplicarse en backend.

## Secretos

- API keys, tokens y passwords del ERP no se guardan en el repositorio.
- En produccion, los secretos se guardan cifrados por cliente.
- El backend nunca debe devolver secretos al frontend.
- `.env` queda solo como fallback de desarrollo y configuracion tecnica local.

## Integracion ERP

- Los padrones operativos requieren `x-company`.
- El backend solo debe sincronizar empresas ERP asociadas al cliente por un admin.
- Cada registro importado guarda `empresaErpId` para trazabilidad.
- Los identificadores internos incluyen empresa para evitar colisiones entre tenants o empresas.

## Datos y multi-cliente

- Todo dato sensible o administrativo debe quedar asociado a `clienteId` cuando aplique.
- Un usuario no debe poder leer ni modificar configuracion de otro cliente.
- Las asignaciones de campos y empresas ERP se guardan por cliente.
- El usuario comun no recibe acceso por empresa completa; recibe acceso por campos asignados.
- La empresa de un dato operativo se infiere con `empresaErpId`, pero no habilita por si sola acceso a todos los datos de esa empresa.
- El filtrado por campos debe ejecutarse en backend antes de responder al frontend.

## Usuario comun

- Un usuario comun solo puede consultar datos de sus campos asignados.
- La UI puede ocultar secciones administrativas, pero no debe ser la barrera principal.
- Los endpoints deben evitar aceptar `clienteId`, `empresaErpId` o `campoErpId` del cliente sin validar que pertenecen al usuario autenticado.
- Para futuras escrituras offline/mobile, el backend debe validar que el registro enviado pertenece a un campo asignado al usuario antes de persistirlo o sincronizarlo al ERP.
- `GET /erp/snapshot` debe responder al usuario comun con un subconjunto ya filtrado desde backend, incluyendo empresas y padrones maestros recortados al alcance operativo cuando aplique.
- Los cultivos deben filtrarse por lotes permitidos, no solo por empresa, porque son datos operativos ligados al campo/lote.

## Planificacion agricola

- Los datos economicos de planificacion son sensibles.
- Toda planificacion debe pertenecer a un `clienteId`.
- Toda fila de planificacion debe validar que el usuario tenga acceso al campo/lote.
- Los protocolos globales solo deben ser modificables por usuarios autorizados.
- Al asignar un protocolo a una planificacion, debe copiarse una version editable para evitar cambios retroactivos no autorizados.
- Los precios, costos e insumos deben auditarse cuando pasen a persistencia real.
- Los precios de insumos ERP deben tratarse como datos economicos sensibles.
- Al usar un insumo en protocolo o planificacion, el costo debe copiarse al modelo propio para preservar trazabilidad de supuestos.
- Toda modificacion de planificacion, protocolo, labores, insumos o valores economicos debe registrar auditoria.
- Toda modificacion de precios de referencia debe auditarse.
- La planificacion debe conservar el precio utilizado originalmente aunque cambie el precio de referencia.
- Toda modificacion de destinos sugeridos debe auditarse.
- La planificacion debe conservar el destino de venta utilizado originalmente aunque cambie la tabla de destinos sugeridos.
- La creacion y vinculacion de padrones base provisorios debe auditarse.
- Solo usuarios autorizados pueden vincular zonas, campos, lotes, especies, actividades e insumos provisorios contra registros ERP.
- Los datos operativos importados desde ERP, como `Agricultura/Cultivos`, no deben crearse manualmente como padrones provisorios.
- Una planificacion cerrada no debe poder modificarse desde ningun cliente.
- El bloqueo de planificaciones cerradas debe validarse en backend, no solo en la interfaz.
- Cerrar una planificacion debe requerir el permiso especifico `planificacion:cerrar` y quedar auditado.

## Padrones maestros

- Las pantallas de padrones maestros son administrativas y deben estar protegidas por permisos especificos.
- El backend debe validar `clienteId` en cada alta, edicion, baja logica o vinculacion ERP.
- Un usuario sin permiso administrativo no debe poder crear, modificar, desactivar ni vincular padrones maestros.
- Las pantallas pueden ocultar acciones no permitidas, pero la autorizacion real debe estar en backend.
- Toda modificacion de padrones maestros debe auditarse.

## Auditoria

- Toda alta, modificacion, baja logica, cambio de estado, asignacion o aprobacion debe registrar quien hizo el cambio, cuando y sobre que entidad.
- La auditoria debe escribirse en backend.
- No deben auditarse secretos completos; solo el hecho de que fueron creados, reemplazados o eliminados.
- Los registros de auditoria deben ser de solo lectura para la aplicacion.

## Pendientes antes de produccion

- Reemplazar modo demo por Microsoft Entra ID real.
- Implementar tabla y servicio de auditoria transversal.
- Revisar rate limits y proteccion ante fuerza bruta.
- Configurar CORS restrictivo por ambiente.
- Definir politica de rotacion de secretos.
- Agregar pruebas de autorizacion para rutas admin.
