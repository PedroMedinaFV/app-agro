# MVP Agro App

## Objetivo

Construir un primer MVP validable para registrar y consultar informacion productiva de campo desde web y mobile, con backend compartido y preparacion para funcionamiento offline.

## Alcance inicial

- Login demo para no bloquear el avance por dependencias externas.
- Dashboard operativo con campos, lotes, pendientes offline y actividad reciente.
- Contratos compartidos en `packages/tipos`.
- Backend REST como fuente de datos para web y mobile.
- Mobile Expo orientado a uso en campo, con foco posterior en offline-first.

## Forma de avance por funcionalidad

1. Definir contrato compartido en `packages/tipos`.
2. Crear o ajustar endpoint en `apps/api`.
3. Implementar experiencia web en `apps/web`.
4. Implementar experiencia mobile equivalente en `apps/mobile`.
5. Documentar flujo y decisiones relevantes.
6. Validar build y pruebas disponibles.

## Bloque actual

Login demo y sesion compartida:

- `POST /auth/demo` en backend.
- `SesionUsuario` y `LoginDemoRequest` como contrato compartido.
- Web consume API y cae a sesion local si la API no esta levantada.
- Mobile usa el mismo contrato en modo local mientras no este conectada a API.

Integracion ERP mock:

- `ErpCampo`, `ErpLote`, `ErpActividad` como contratos compartidos.
- `GET /erp/snapshot` para alimentar front sin depender de base.
- Tablas `Erp*` preparadas para persistir el snapshot cuando PostgreSQL este disponible.
- `Cliente` e `IntegracionErp` preparados para configuracion multi-cliente del ERP.

Roles y permisos:

- `admin` y `usuario` como roles iniciales.
- Permisos declarativos compartidos en `packages/tipos`.
- Backend protegido con middleware `requierePermiso`.
- Web muestra u oculta configuracion ERP segun permisos.
- Asignacion de campos ERP por usuario preparada para filtrar datos operativos.
