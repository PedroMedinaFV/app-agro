# Roles y Permisos

## Decision MVP

Para el MVP cada usuario tiene un solo rol principal.

Motivo:

- reduce ambiguedad operativa;
- evita combinaciones dificiles de explicar al usuario;
- simplifica auditoria y soporte;
- mantiene seguridad por defecto con menor superficie de error.

La autorizacion no queda atada solamente al nombre del rol: el backend valida permisos declarativos. Esto permite sumar roles multiples o permisos especiales mas adelante sin reescribir todas las rutas.

## Roles

- `admin`: administra configuracion, integraciones ERP, usuarios, empresas AGRO, sincronizacion, padrones, seguridad y auditoria.
- `planificador`: gestiona planificacion agricola, escenarios, protocolos, precios, gastos comerciales y padrones propios de Agro App.
- `operador_campo`: trabaja en campo, principalmente desde mobile, sobre campos/lotes asignados. Puede cargar datos operativos como precipitaciones y, mas adelante, recorridas, observaciones e imagenes.

## Permisos

Los permisos son declarativos y viven en `packages/tipos/src/auth.ts`.

| Permiso | Admin | Planificador | Operador de campo | Uso |
| --- | --- | --- | --- | --- |
| `erp:configurar` | Si | No | No | Configurar credenciales e integracion ERP |
| `erp:sincronizar` | Si | No | No | Disparar sincronizacion ERP |
| `erp:leer` | Si | Si | Si | Consultar snapshot ERP |
| `usuarios:gestionar` | Si | No | No | Administrar usuarios |
| `usuarios:asignar-campos` | Si | No | No | Asignar campos ERP visibles por operador |
| `campos:leer` | Si | Si | Si | Consultar campos |
| `lotes:leer` | Si | Si | Si | Consultar lotes |
| `actividades:leer` | Si | Si | Si | Consultar actividades |
| `planificacion:leer` | Si | Si | Si | Consultar planificaciones dentro del alcance permitido |
| `planificacion:editar` | Si | Si | No | Crear o editar planificaciones |
| `planificacion:aprobar` | Si | Si | No | Aprobar planificaciones |
| `planificacion:cerrar` | Si | Si | No | Cerrar planificaciones y bloquear ediciones |
| `planificacion:configurar` | Si | Si | No | Administrar protocolos, precios y destinos sugeridos |
| `padrones-base:gestionar` | Si | Si | No | Crear, editar o vincular zonas/campos/lotes/especies/actividades/insumos provisorios con ERP |
| `registros:crear` | Si | No | Si | Crear registros de campo |
| `registros:sincronizar` | Si | No | Si | Sincronizar pendientes mobile/offline |
| `precipitaciones:crear` | Si | No | Si | Cargar precipitaciones sobre campos asignados |
| `precipitaciones:leer` | Si | Si | Si | Consultar precipitaciones dentro del alcance permitido |

## Backend

Las rutas usan `requierePermiso`.

Ejemplos:

- `/erp`: requiere `erp:leer`.
- `/erp/sincronizar`: requiere `erp:sincronizar`.
- `/usuarios`: requiere `usuarios:gestionar`.
- `/admin/integracion-erp`: requiere `erp:configurar`.
- `/admin/asignaciones`: requiere `usuarios:asignar-campos`.
- `/planificacion`: requiere `planificacion:leer` o `planificacion:editar` segun operacion.
- `/planificacion/:id/cerrar`: requiere `planificacion:cerrar`.
- `/admin/planificacion/configuracion`: requiere `planificacion:configurar`.
- `/admin/padrones-base`: requiere `padrones-base:gestionar`.
- `/precipitaciones`: requiere `precipitaciones:leer` o `precipitaciones:crear` segun operacion.

## Frontend

La web usa los permisos de la sesion para mostrar u ocultar secciones. Por ejemplo, `Config. ERP` solo aparece si el usuario tiene `erp:configurar`.

El login web real no permite seleccionar rol: el rol y los campos asignados se obtienen del backend segun el usuario preconfigurado por el administrador. Para desarrollo local queda un acceso `demo admin`.

## Alcance por campos

Cada operador de campo tiene asignados campos ERP especificos para trabajar. El backend filtra el snapshot ERP usando esas asignaciones.

- `admin`: ve todos los campos del cliente.
- `planificador`: ve todos los campos del cliente para poder planificar.
- `operador_campo`: ve solo campos asignados.

Los campos importados desde ERP incluyen `empresaErpId`. Por lo tanto, la empresa no se asigna directamente al operador: se infiere desde los campos asignados.

Ejemplo:

- Si el operador tiene `empresa:1:campo:241`, puede ver ese campo y sus lotes.
- Si tambien tiene `empresa:2:campo:241`, puede ver ese otro campo aunque tenga el mismo identificador numerico del ERP.
- Si no tiene campos asignados de `empresa:2`, no ve datos operativos de esa empresa.

Endpoints preparados:

- `GET /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`
- `PUT /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`

## Inicio por rol

`admin` inicia en una vista de control y configuracion.

`planificador` inicia en una vista orientada a planificacion, protocolos, precios, gastos y padrones necesarios.

`operador_campo` inicia en una vista operativa:

- campos asignados;
- lotes disponibles;
- acciones de carga permitidas;
- carga rapida de precipitaciones;
- pendientes de sincronizacion;
- estado de conectividad cuando exista offline-first.

El operador no debe ver:

- configuracion ERP;
- seleccion de empresas ERP;
- administracion de usuarios;
- asignacion de campos;
- cierre o configuracion de planificaciones.

## Roles multiples

No se implementan roles multiples en el MVP.

Si mas adelante un usuario necesita capacidades mixtas, se evaluara una de estas opciones:

- cambiarlo a un rol superior;
- crear un nuevo rol compuesto;
- agregar permisos explicitos por usuario con auditoria y fecha de vigencia.

La opcion recomendada para escalar es agregar permisos explicitos, no asignar una lista libre de roles, porque es mas auditable y reduce conflictos.
