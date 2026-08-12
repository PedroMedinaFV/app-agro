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
| `registros:crear` | Si | Si | Crear registros de campo |
| `registros:sincronizar` | Si | Si | Sincronizar pendientes mobile/offline |

## Backend

Las rutas usan `requierePermiso`.

Ejemplos:

- `/erp`: requiere `erp:leer`.
- `/erp/sincronizar`: requiere `erp:sincronizar`.
- `/admin/integracion-erp`: requiere `erp:configurar`.
- `/admin/asignaciones`: requiere `usuarios:asignar-campos`.

## Frontend

La web usa los permisos de la sesion para mostrar u ocultar secciones. Por ejemplo, `Config. ERP` solo aparece si el usuario tiene `erp:configurar`.

## Demo

El login demo permite seleccionar rol `admin` o `usuario` para validar permisos sin depender de usuarios reales.

## Alcance por campos

Cada usuario puede tener asignados campos ERP especificos para trabajar. El backend filtra el snapshot ERP usando esas asignaciones.

- `admin`: ve todos los campos del cliente.
- `usuario`: ve solo campos asignados.

Endpoints preparados:

- `GET /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`
- `PUT /admin/asignaciones/:clienteId/usuarios/:usuarioId/campos`

En modo demo, un usuario comun ve solo `ERP-CAMPO-001` para poder validar el recorte sin base de datos.
