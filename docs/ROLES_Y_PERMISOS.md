# Roles y Permisos

## Roles iniciales

- `admin`: administra configuracion, integraciones y usuarios.
- `usuario`: opera la app de campo y consulta datos sincronizados.

## Permisos

Los permisos son declarativos y viven en `packages/tipos/src/auth.ts`.

| Permiso | Admin | Usuario | Uso |
| --- | --- | --- | --- |
| `erp:configurar` | Si | No | Configurar credenciales e integracion ERP |
| `erp:sincronizar` | Si | No | Disparar sincronizacion ERP |
| `erp:leer` | Si | Si | Consultar snapshot ERP |
| `usuarios:gestionar` | Si | No | Administrar usuarios |
| `usuarios:asignar-campos` | Si | No | Asignar campos ERP visibles por usuario |
| `campos:leer` | Si | Si | Consultar campos |
| `lotes:leer` | Si | Si | Consultar lotes |
| `actividades:leer` | Si | Si | Consultar actividades |
| `planificacion:leer` | Si | Si | Consultar planificaciones dentro del alcance permitido |
| `planificacion:editar` | Si | Si | Crear o editar planificaciones en campos/lotes permitidos |
| `planificacion:aprobar` | Si | No | Aprobar planificaciones |
| `planificacion:cerrar` | Si | No | Cerrar planificaciones y bloquear ediciones |
| `planificacion:configurar` | Si | No | Administrar protocolos, precios y destinos sugeridos |
| `padrones-base:gestionar` | Si | No | Crear, editar o vincular zonas/campos/lotes/especies/actividades/insumos provisorios con ERP |
| `registros:crear` | Si | Si | Crear registros de campo |
| `registros:sincronizar` | Si | Si | Sincronizar pendientes mobile/offline |

## Backend

Las rutas usan `requierePermiso`.

Ejemplos:

- `/erp`: requiere `erp:leer`.
- `/erp/sincronizar`: requiere `erp:sincronizar`.
- `/admin/integracion-erp`: requiere `erp:configurar`.
- `/admin/asignaciones`: requiere `usuarios:asignar-campos`.
- `/planificacion`: requiere `planificacion:leer` o `planificacion:editar` segun operacion.
- `/planificacion/:id/cerrar`: requiere `planificacion:cerrar`.
- `/admin/planificacion/configuracion`: requiere `planificacion:configurar`.
- `/admin/padrones-base`: requiere `padrones-base:gestionar`.

## Frontend

La web usa los permisos de la sesion para mostrar u ocultar secciones. Por ejemplo, `Config. ERP` solo aparece si el usuario tiene `erp:configurar`.

## Demo

El login demo permite seleccionar rol `admin` o `usuario` para validar permisos sin depender de usuarios reales.

## Alcance por campos

Cada usuario puede tener asignados campos ERP especificos para trabajar. El backend filtra el snapshot ERP usando esas asignaciones.

- `admin`: ve todos los campos del cliente.
- `usuario`: ve solo campos asignados.

Los campos importados desde ERP incluyen `empresaErpId`. Por lo tanto, la empresa no se asigna directamente al usuario comun: se infiere desde los campos asignados.

Ejemplo:

- Si el usuario tiene `empresa:1:campo:241`, puede ver ese campo y sus lotes.
- Si tambien tiene `empresa:2:campo:241`, puede ver ese otro campo aunque tenga el mismo identificador numerico del ERP.
- Si no tiene campos asignados de `empresa:2`, no ve datos operativos de esa empresa.

Endpoints preparados:

- `GET /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`
- `PUT /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`

En modo demo, un usuario comun ve solo `empresa:mock:campo:241` para poder validar el recorte sin base de datos.

## Inicio de usuario comun

El inicio de un usuario comun debe estar enfocado en la operacion diaria, no en administracion:

- resumen de campos asignados;
- lotes disponibles;
- acciones de carga permitidas;
- pendientes de sincronizacion;
- estado de conectividad cuando exista offline-first.

No debe mostrar:

- configuracion ERP;
- seleccion de empresas ERP;
- administracion de usuarios;
- asignacion de campos.

## Planificacion y padrones base provisorios

El usuario comun puede crear o editar planificacion solo sobre campos/lotes dentro de su alcance operativo.

La creacion y vinculacion de padrones base provisorios queda reservada inicialmente a usuarios con permiso especifico. Esta operacion es sensible porque puede cambiar la relacion entre datos propios de Agro App y padrones del ERP.

Aplica a zonas, campos, lotes, especies, actividades e insumos. No aplica a datos operativos importados desde ERP como `Agricultura/Cultivos`.

El cierre de una planificacion queda reservado a usuarios con `planificacion:cerrar`. Una vez cerrada, ningun rol puede modificarla desde el flujo normal.
