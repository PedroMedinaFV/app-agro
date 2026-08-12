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

1. Backend expone `GET /erp/snapshot` con datos mock de campos, lotes y actividades.
2. Web consume ese snapshot para alimentar el dashboard.
3. Si la API no esta disponible, web usa un snapshot local minimo.
4. Cuando PostgreSQL este disponible, `POST /erp/sincronizar` persiste el snapshot en tablas `Erp*`.

## Roles demo

1. En web, el usuario selecciona `admin` o `usuario`.
2. `POST /auth/demo` devuelve una sesion con permisos segun rol.
3. La web manda el token al consultar `/erp/snapshot`.
4. El backend valida el JWT y aplica permisos.
5. Las secciones administrativas solo aparecen para `admin`.

## Asignacion de campos por usuario

1. Un admin asigna campos ERP a un usuario.
2. El backend guarda las asignaciones en `UsuarioCampoErp`.
3. Cuando el usuario consulta `GET /erp/snapshot`, el backend filtra campos, lotes y actividades.
4. El usuario solo ve y trabaja sobre sus campos asignados.
