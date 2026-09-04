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
7. Revisar implicancias de seguridad: autenticacion, autorizacion, exposicion de datos y persistencia.
8. Definir que eventos de auditoria genera cada alta, modificacion o cambio de estado.

## Bloque actual

Login demo y sesion compartida:

- `POST /auth/demo` en backend.
- `SesionUsuario` y `LoginDemoRequest` como contrato compartido.
- Web consume API y cae a sesion local si la API no esta levantada.
- Mobile usa el mismo contrato en modo local mientras no este conectada a API.

Integracion ERP mock:

- `ErpCampo`, `ErpLote`, `ErpActividad`, `ErpEspecie`, `ErpCampania`, `ErpCultivo` y `ErpInsumo` como contratos compartidos.
- `GET /erp/snapshot` para alimentar front sin depender de base.
- Tablas `Erp*` preparadas para persistir el snapshot cuando PostgreSQL este disponible.
- `Cliente` e `IntegracionErp` preparados para configuracion multi-cliente del ERP.
- `Sistema/Empresas` preparado para que el admin seleccione que empresas ERP corresponden a AGRO.
- Sincronizacion por empresa usando `x-company` y conservando `empresaErpId` en los datos importados.
- Campanias agricolas importadas por empresa para definir campania actual y futuras cargas operativas.
- Cultivos agricolas importados por empresa y asociados a campo, lote, actividad, especie y campania.
- Insumos ERP importados por empresa como referencia para protocolos productivos.

Roles y permisos:

- `admin` y `usuario` como roles iniciales.
- Permisos declarativos compartidos en `packages/tipos`.
- Backend protegido con middleware `requierePermiso`.
- Web muestra u oculta configuracion ERP segun permisos.
- Asignacion de campos ERP por usuario preparada para filtrar datos operativos.
- Usuario comun definido con alcance por campos asignados; la empresa ERP se deriva de cada campo mediante `empresaErpId`.
- Inicio de usuario comun implementado en modo demo web/mobile como vista operativa `Mi trabajo`.

Pantallas actuales:

- Web: dashboard demo, pantalla admin `Empresas ERP` e inicio `Mi trabajo` para usuario comun.
- Mobile: login demo, panel mobile admin y panel `Mi trabajo` para usuario comun.

Proxima pantalla sugerida:

- Web: planilla editable de planificacion agricola por campania/campo/lote en modo demo.
- Web: pantalla editable de protocolos productivos con etapas, labores, insumos y costo por hectarea en modo demo.
- Backend: contratos y endpoint mock de planificacion para validar calculos y guardado de borrador antes de persistir.
- Backend: endpoints mock de protocolos productivos para validar contratos de edicion y guardado.
- Backend: persistencia de planificacion, protocolos, labores e insumos cuando PostgreSQL este disponible.
- Backend: tabla de precios de referencia para proponer precio de venta y calcular margen actualizado.
- Backend: tabla de destinos sugeridos por zona/campo/actividad para proponer destino de venta.
- Backend/web: herramienta para crear padrones base provisorios y vincularlos luego con ERP.
- Mobile: vista de lectura o consulta de planificacion y protocolo asignado, dejando carga avanzada para una etapa posterior.

Premisas transversales:

- Toda edicion de datos de usuario debe quedar auditada.
- El plan de avance por sprints queda documentado en `docs/PLAN_MVP_SPRINTS.md`.
