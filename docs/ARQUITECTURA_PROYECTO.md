# Arquitectura del proyecto

Este documento resume como esta montada la aplicacion para que una persona nueva pueda seguir el proyecto sin tener que reconstruir el mapa desde cero.

La app es un monorepo con cuatro piezas principales:

- `apps/web`: frontend web en React/Vite.
- `apps/api`: backend HTTP en Express + Prisma.
- `apps/mobile`: Expo/React Native para registros operativos y pendientes offline.
- `packages/tipos`: contratos, permisos y helpers compartidos entre API, web y mobile.

La persistencia PostgreSQL ya esta implementada mediante Prisma y migraciones. Este documento describe el codigo actual; las mejoras pendientes y su validacion se registran en [PLAN_ACCION_ESTABILIZACION.md](PLAN_ACCION_ESTABILIZACION.md) y [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md). Los comandos de inicio estan en el [README](../README.md).

## Vista General

```txt
Usuario
  |
  v
apps/web
  App.tsx
    -> Layout / LoginPanel
    -> screens/*
       -> hooks/*
       -> components/*
       -> services/api.ts
       -> utils/*
  |
  v HTTP + Bearer token
apps/api
  src/index.ts
    -> crearApp en src/app.ts (rutas y middleware sin abrir puerto al importar)
    -> middleware/autenticacion.ts
    -> middleware/permisos.ts
    -> routes/*
       -> services/*
          -> Prisma / ERP / Storage / reglas de dominio
  |
  v
PostgreSQL / ERP externo / Storage

packages/tipos
  -> tipos, permisos y contratos compartidos entre API, web y mobile

apps/mobile
  src/App.tsx (entrada declarada en package.json)
    -> services/api.ts / clienteApi.ts -> API HTTP
    -> services/almacenamientoLocal.ts -> AsyncStorage o localStorage en web
    -> services/sincronizacion.ts -> POST /sincronizacion
    -> fotos locales -> firma de subida -> Supabase Storage
```

## Monorepo

### `package.json`

Define los workspaces:

- `apps/*`
- `packages/*`

Scripts principales:

- `pnpm dev`: levanta los proyectos en modo desarrollo.
- `pnpm build`: compila todos los workspaces.
- `pnpm --filter agro-app-web build`: valida solo la web.
- `pnpm --filter agro-app-api dev`: levanta la API.

## Web

La web esta organizada por capas. La regla general es: la pantalla compone, el hook maneja estado y API, los componentes dibujan, los utils calculan/formatean.

### Estructura

```txt
apps/web/src
  App.tsx
  components/
  hooks/
  screens/
  services/
  utils/
  data/
  styles.css
```

### `App.tsx`

Es el orquestador principal de la web.

Responsabilidades:

- Manejar la vista activa.
- Inicializar hooks globales como `useAuth`, `useErp`, `usePlanificacion`, `useProtocolos`, `useToast`.
- Resolver permisos globales del usuario.
- Cargar pantallas con `lazy`.
- Pasar datos y handlers a cada `screen`.
- Renderizar `Layout`, `LoginPanel` y `ToastViewport`.

No deberia contener:

- formularios completos;
- tablas largas;
- reglas de negocio extensas;
- llamadas HTTP especificas de una pantalla, salvo cargas globales justificadas.

### `screens`

Representan vistas navegables.

Ejemplos:

- `PlanificacionScreen.tsx`
- `ProtocolosScreen.tsx`
- `MonitoreosScreen.tsx`
- `ObservacionesScreen.tsx`
- `SeguimientoOperativoScreen.tsx`
- `PrecipitacionesScreen.tsx`
- `UsuariosAdminScreen.tsx`

Responsabilidades:

- Armar la estructura visual de la vista.
- Conectar hooks con componentes.
- Pasar props.
- Mostrar `PageHeader`, `Panel` y layout de secciones.

Patron recomendado:

```txt
screens/MonitoreosScreen.tsx
  -> hooks/useRecorridas.ts
  -> components/recorridas/FormularioRecorrida.tsx
  -> components/recorridas/TablaRecorridas.tsx
```

Una `screen` deberia mantenerse chica. Si empieza a superar 350-450 lineas, conviene extraer:

- formulario;
- tabla;
- filtros;
- ficha/resumen;
- hook de estado.

### `components`

Contiene piezas visuales.

Componentes globales:

- `Layout.tsx`: estructura general, header y sidebar.
- `LoginPanel.tsx`: login con email/password y Microsoft.
- `PageHeader.tsx`: encabezado estandar de pantallas.
- `Panel.tsx`: contenedor visual reutilizable.
- `DataTable.tsx`: tabla responsive de datos.
- `Button.tsx`, `IconButton.tsx`: botones del sistema.
- `FechaInput.tsx`, `DecimalInput.tsx`, `SignedIntegerInput.tsx`: inputs especializados.

Componentes por modulo:

```txt
components/recorridas/
  FormularioRecorrida.tsx
  TablaRecorridas.tsx
  SelectorRecorrida.tsx

components/observaciones/
  FormularioObservacion.tsx
  TablaObservaciones.tsx
  FichaLoteObservaciones.tsx

components/seguimiento/
  FiltrosSeguimiento.tsx
  MetricasSeguimiento.tsx
  FichaSeguimientoLote.tsx
  TablaSeguimientoObservaciones.tsx
  TablaSeguimientoPrecipitaciones.tsx

components/planificacion/
  LineaPlanificacion.tsx
```

Regla:

- Si tiene estado complejo o llamadas a API, no deberia vivir entero en `components`; eso va a `hooks`.
- Si solo renderiza datos y dispara callbacks, esta bien como componente.

### `hooks`

Contienen estado, efectos, carga de datos y handlers.

Ejemplos:

- `useAuth.ts`: sesion, login, logout.
- `useErp.ts`: snapshot ERP, empresas y sincronizacion base.
- `usePlanificacion.ts`: estado de planificacion agricola.
- `useProtocolos.ts`: carga, edicion y guardado de protocolos.
- `useRecorridas.ts`: estado de monitoreos/recorridas.
- `useObservaciones.ts`: estado de observaciones.
- `useSeguimientoOperativo.ts`: filtros, ficha operativa, NDVI, observaciones y precipitaciones.
- `useToast.ts`: notificaciones visuales.

Dependencia tipica:

```txt
Screen
  -> useModulo
     -> services/api.ts
     -> utils/modulo/helpersModulo.ts
     -> packages/tipos
```

Regla:

- Si la funcion usa `useState`, `useEffect`, token, API o notificaciones, probablemente va en un hook.
- Si es calculo puro, va en `utils`.

### `services`

`services/api.ts` expone los casos de uso HTTP de la web y delega el transporte comun a `services/apiClient.ts` (`request`, cache e invalidacion).

Responsabilidades:

- Centralizar `fetch`.
- Construir URLs hacia la API.
- Enviar `Authorization: Bearer <token>`.
- Parsear errores del backend.
- Exponer funciones por caso de uso.

Ejemplos:

- `obtenerPlanificacionSnapshot`
- `guardarPlanificacion`
- `obtenerProtocolos`
- `crearRecorridaCampo`
- `cerrarRecorridaCampo`
- `obtenerObservaciones`
- `crearObservacion`
- `obtenerUltimoMapaNdviLote`

Regla:

- Las screens y hooks no deberian escribir `fetch` directo.
- Toda llamada nueva deberia pasar por `services/api.ts`.

### `utils`

Funciones puras, sin estado y sin efectos.

Ejemplos:

- `utils/formatters.ts`: `formatearFecha`, `formatearFechaHora`, `formatearUsd`, `formatearNumero`, `leerNumero`.
- `utils/planificacion/helpersPlanificacion.ts`: reglas/calculos de planificacion.
- `utils/recorridas/helpersRecorridas.ts`: valores iniciales y etiquetas de recorridas.
- `utils/seguimiento/helpersSeguimiento.ts`: helpers visuales de seguimiento.
- `utils/gastos/helpersGastos.ts`, `utils/lotes/helpersLotes.ts`, `utils/padrones/helpersPadrones.ts`.

Regla:

- No llamar API desde `utils`.
- No guardar estado en `utils`.
- No duplicar formateadores; usar `formatters.ts`.

### Flujo Web Completo

Ejemplo con Monitoreos:

```txt
Layout sidebar
  -> usuario abre "Monitoreos"
  -> App.tsx setea vista = monitoreos
  -> MonitoreosScreen
     -> useRecorridas
        -> obtenerPlanificacionSnapshot()
        -> obtenerRecorridasCampo()
        -> crearRecorridaCampo()
        -> cerrarRecorridaCampo()
     -> FormularioRecorrida
     -> TablaRecorridas
```

Ejemplo con Seguimiento Operativo:

```txt
SeguimientoOperativoScreen
  -> useSeguimientoOperativo
     -> obtenerPlanificacionSnapshot()
     -> obtenerObservaciones()
     -> obtenerPrecipitaciones()
     -> obtenerFichaLoteOperativo()
     -> obtenerUltimoMapaNdviLote()
  -> FiltrosSeguimiento
  -> MetricasSeguimiento
  -> FichaSeguimientoLote
  -> TablaSeguimientoObservaciones
  -> TablaSeguimientoPrecipitaciones
```

## API

La API esta montada sobre Express.

### Estructura

```txt
apps/api/src
  index.ts
  routes/
  services/
  middleware/
  config/
  scripts/

apps/api/prisma
  schema.prisma
  migrations/
  seed.ts
```

### `src/app.ts` y `src/index.ts`

`app.ts` expone `crearApp()` para componer la API sin abrir un puerto al importar. `index.ts` llama esa fabrica y abre el servidor en `PORT` o `4000`. Las pruebas HTTP completas usan la misma composicion y servicios reales con un schema aislado.

Responsabilidades de `crearApp`:

- Crear la app Express.
- Configurar CORS.
- Configurar body parser.
- Registrar rutas.
- Aplicar autenticacion y permisos.
- Registrar el manejador global de errores.
- Validar configuracion antes de devolver la app. El servidor lo abre exclusivamente `index.ts`.

Ejemplo conceptual:

```ts
app.use('/planificacion', autenticacionBasica, planificacionRuta);
app.use('/recorridas', autenticacionBasica, recorridasRuta);
app.use('/auditoria', autenticacionBasica, requierePermiso('auditoria:leer'), auditoriaRuta);
app.use(manejadorErrores);
```

### `routes`

Definen endpoints HTTP. Deberian ser delgados.

Responsabilidades:

- Recibir request.
- Leer params/body/query.
- Tomar el usuario autenticado.
- Llamar al service correspondiente.
- Responder JSON.

Ejemplos:

- `routes/auth.ts`
- `routes/planificacion.ts`
- `routes/recorridas.ts`
- `routes/observaciones.ts`
- `routes/precipitaciones.ts`
- `routes/operativo.ts`
- `routes/ndvi.ts`
- `routes/preciosReferencia.ts`
- `routes/gastosComercialesReferencia.ts`
- `routes/*App.ts` para padrones internos.

Regla:

- No poner reglas de negocio largas en rutas.
- No acceder a Prisma directamente desde rutas salvo casos muy chicos y justificados.

### `services`

Contienen reglas de negocio, persistencia y coordinacion con Prisma/ERP.

Ejemplos por dominio:

```txt
services/planificacion/
services/recorridas/
services/observaciones/
services/precipitaciones/
services/operativo/
services/ndvi/
services/preciosReferencia/
services/gastosComerciales/
services/erp/
services/auditoria/
services/usuarios/
```

Responsabilidades:

- Validaciones de dominio.
- Consultas Prisma.
- Transacciones.
- Auditoria.
- Normalizacion de datos.
- Integracion con ERP o Storage cuando corresponda.

Patron esperado:

```txt
route
  -> service
     -> Prisma
     -> auditoria
     -> respuesta tipada
```

### `middleware`

Piezas transversales de Express.

- `autenticacion.ts`: valida token JWT y carga `req.user`.
- `rutaAsincrona.ts`: lleva excepciones y rechazos de handlers a `next` en Express 4; usado por las tres rutas de autenticacion.
- `permisos.ts`: valida permisos por rol usando `@agro/tipos`.
- `manejadorErrores.ts`: respuesta estandar de errores.

`config/jwt.ts` centraliza la clave obligatoria, HS256 y duracion de ocho horas; `index.ts` valida antes de abrir el puerto. `services/seguridad/sesionJwt.ts` emite/verifica y `validacionesAuth.ts` valida entradas desconocidas. Prisma reutiliza `config/cargarEnvRaiz.ts` sin sobrescribir variables del proceso. Ver [AUTENTICACION.md](AUTENTICACION.md) para reglas, responsabilidades y actualizacion de entornos.

Flujo:

```txt
Request
  -> autenticacionBasica
  -> requierePermiso / requiereAlgunPermiso
  -> route
  -> service
  -> manejadorErrores si falla
```

### Prisma

`apps/api/prisma/schema.prisma` define el modelo de datos.

Conceptos principales:

- `Usuario`, `Cliente`, roles y permisos.
- Integracion ERP: `IntegracionErp`, `ErpSincronizacion`, tablas `Erp*`.
- Padrones App: `ZonaApp`, `CampoApp`, `LoteApp`, `ActividadApp`, `EspecieApp`, `InsumoApp`, `ServicioApp`, `DestinoApp`.
- Planificacion: `PlanificacionAgricola`, `PlanificacionAgricolaLinea`, `ProtocoloProductivo`.
- Costos: `PrecioApp`, `GastoComercialApp`, `ConceptoGastoComercialApp`.
- Operativo: `PrecipitacionCampo`, `ObservacionCampo`, `RecorridaCampo`.
- NDVI/geografia: `LoteMapaNdvi`, `LoteArchivoGeografico`.
- Auditoria: `AuditoriaEvento`.

Migrations:

```txt
apps/api/prisma/migrations/
```

Regla:

- Todo cambio de modelo debe ir con migracion.
- Si cambia un contrato usado por web/API, actualizar tambien `packages/tipos`.

## `packages/tipos`

Es la capa compartida.

Contiene:

- tipos TypeScript de dominio;
- respuestas de API;
- permisos y roles;
- contratos de planificacion, observaciones, recorridas, NDVI, auth, ERP.

Archivos relevantes:

- `auth.ts`: roles, permisos, helpers como `tienePermiso`.
- `planificacion.ts`: contratos de planificacion.
- `recorrida.ts`: contratos de recorridas/monitoreos.
- `observacion.ts`: contratos de observaciones.
- `precipitacion.ts`: contratos de precipitaciones.
- `operativo.ts`: ficha operativa.
- `ndvi.ts`: mapas NDVI.
- `erp.ts`: entidades importadas del ERP.
- `index.ts`: exports publicos.

Regla:

- Si una respuesta de API la consume la web, su tipo deberia estar aca.
- Evitar tipos duplicados en web y API.

## Flujo De Datos

### Login

```txt
LoginPanel
  -> useAuth
  -> services/api.ts
  -> POST /auth/*
  -> routes/auth.ts
  -> resolvers de auth.ts / prisma.ts / services/microsoftIdentity.ts
  -> JWT + usuario + permisos
```

### Pantalla protegida

```txt
App.tsx
  -> sesion.token
  -> screen
  -> hook
  -> services/api.ts con Authorization
  -> API middleware/autenticacion.ts
  -> API middleware/permisos.ts cuando aplica
  -> route
  -> service
  -> Prisma
```

### Sincronizacion ERP

```txt
SincronizacionErpScreen
  -> services/api.ts
  -> POST /erp/sincronizar
  -> routes/erp.ts
  -> services/erp
  -> ERP externo
  -> tablas Erp*
  -> padrones App / vinculaciones sugeridas
```

HTTP y CLI entran por `services/erp/ejecutarSincronizacionErp.ts`. `bloqueoSincronizacionErp.ts` adquiere una reserva persistente con token/vencimiento e historial asociado. La importacion, escritores indirectos y cierre del historial comparten una transaccion acotada mediante `contextoTransaccional.ts` y el cliente exportado por `prisma.ts`; fuera del contexto los demas flujos usan el cliente habitual. Una puerta adicional protege el refresco de maestros globales entre clientes. Ver [ERP_CONCURRENCIA.md](ERP_CONCURRENCIA.md) para migracion, limites de pool/duracion, recuperacion y prueba real pendiente.

### Padrones

```txt
ERP externo
  -> tablas Erp*
  -> sincronizacion
  -> tablas *App
  -> web padrones
  -> usuario completa atributos App
```

Regla de negocio acordada:

- Lo que viene del ERP es origen `ERP`.
- Lo creado desde la app es origen `Agro App`.
- Lo creado desde la app nace como provisorio cuando corresponde.
- Algunos padrones son globales y no deben pedir empresa al usuario.

## Mobile y sincronizacion offline

`apps/mobile/package.json` declara `src/App.tsx` como entrada. Ese archivo concentra actualmente login, seleccion de campo/lote, consulta operativa y formularios; su separacion por responsabilidad es trabajo pendiente. Existen tambien carpetas de navegacion y store, pero no deben asumirse como el flujo activo sin revisar sus imports desde la entrada.

- `services/api.ts` contiene operaciones HTTP y subida de archivos; `services/clienteApi.ts` se usa para enviar pendientes.
- `services/almacenamientoLocal.ts` adapta AsyncStorage/localStorage y construye una cola por cliente/usuario. `services/offline/cola.ts` serializa sus mutaciones y verifica propietarios/formato.
- `services/offline/sincronizador.ts` coordina reintentos y progreso con dependencias inyectadas. `services/sincronizacion.ts` lo conecta con firmas, subidas y `POST /sincronizacion` usando la sesion capturada.
- `services/adjuntosLocales.ts` preserva fotos en sandbox nativo o contenido data URL en web. La pantalla guarda siempre en la cola antes del primer envio y mantiene un ID estable.
- `routes/sincronizacion.ts` delega en `services/sincronizacionOffline.ts`; se soportan observaciones y precipitaciones. Los tipos no soportados quedan pendientes con error.
- Los servicios operativos validan alcance y persistencia. PostgreSQL impone unicidad por `clienteId` y `registroMovilId` para esos registros.

La cola nueva esta particionada por cliente/usuario; la antigua clave global se conserva sin importacion automatica porque no identifica al propietario. La exclusion cubre un runtime JavaScript, no multiples procesos/pestanas web. La sesion y el snapshot operativo siguen en memoria: no se debe prometer un arranque offline completo despues de reiniciar. Ver [OFFLINE.md](OFFLINE.md) para contratos, errores y pruebas; la validacion en dispositivo y con servicios reales sigue pendiente.

## Como Agregar Una Nueva Funcionalidad

1. Definir contrato en `packages/tipos/src`.
2. Exportarlo desde `packages/tipos/src/index.ts`.
3. Agregar modelos/migracion Prisma si requiere persistencia.
4. Crear service en `apps/api/src/services/<modulo>`.
5. Crear route en `apps/api/src/routes/<modulo>.ts`.
6. Registrar route en `apps/api/src/app.ts`.
7. Agregar funciones HTTP en `apps/web/src/services/api.ts`.
8. Crear hook en `apps/web/src/hooks/use<Modulo>.ts`.
9. Crear componentes en `apps/web/src/components/<modulo>/`.
10. Crear screen en `apps/web/src/screens/<Modulo>Screen.tsx`.
11. Registrar vista en `App.tsx` y `Layout.tsx`.
12. Reutilizar componentes, hooks, helpers, middleware y servicios existentes antes de crear variantes nuevas.
13. Agregar tests automaticos proporcionales al riesgo de la feature.
14. Documentar el flujo en `docs/`.
15. Ejecutar las verificaciones pertinentes y registrar resultados y limitaciones en la documentacion del modulo o en el estado de estabilidad.

La guia obligatoria para tests, reutilizacion y modularizacion queda en `docs/CALIDAD_TESTS_MODULARIZACION.md`.

## Convenciones De Nombres

Preferencia actual:

- Archivos y funciones en espanol o mixtos amigables para el equipo.
- Evitar nombres historicos como `Demo` si la funcionalidad ya es real.
- Preferir:
  - `helpersLotes`
  - `helpersPlanificacion`
  - `useRecorridas`
  - `FormularioRecorrida`
  - `TablaRecorridas`

Evitar:

- duplicar helpers de fecha;
- duplicar tipos de dominio;
- poner reglas de negocio en JSX;
- tener screens enormes;
- que una pantalla haga `fetch` directo.

## Checklist Para Entender Un Modulo

Para estudiar un modulo existente, leer en este orden:

1. `App.tsx`: donde se monta la vista.
2. `screens/<Modulo>Screen.tsx`: como se compone la pantalla.
3. `hooks/use<Modulo>.ts`: estado, carga y handlers.
4. `services/api.ts`: endpoints usados por web.
5. `apps/api/src/routes/<modulo>.ts`: endpoints reales.
6. `apps/api/src/services/<modulo>/`: reglas y persistencia.
7. `packages/tipos/src/<modulo>.ts`: contratos.
8. `schema.prisma`: modelos involucrados.
9. `docs/<MODULO>.md`: decisiones y flujo funcional.

## Modulos Actuales Principales

### Planificacion

- Web:
  - `PlanificacionScreen.tsx`
  - `PlanificacionEditorScreen.tsx`
  - `PlanificacionesResumenScreen.tsx`
  - `hooks/usePlanificacion.ts`
  - `components/planificacion/*`
- API:
  - `routes/planificacion.ts`
  - `services/planificacion/*`
- Tipos:
  - `packages/tipos/src/planificacion.ts`

### Protocolos

- Web:
  - `ProtocolosScreen.tsx`
  - `components/protocolos/ProtocoloModal.tsx`
  - `hooks/useProtocolos.ts`
- API:
  - `routes/planificacion.ts`
  - `services/planificacion/protocolosPrisma.ts`

### Monitoreos / Recorridas

- Web:
  - `MonitoreosScreen.tsx`
  - `hooks/useRecorridas.ts`
  - `components/recorridas/*`
  - `utils/recorridas/helpersRecorridas.ts`
- API:
  - `routes/recorridas.ts`
  - `services/recorridas/recorridasPrisma.ts`
- Tipos:
  - `packages/tipos/src/recorrida.ts`
- Docs:
  - `docs/RECORRIDAS_MONITOREOS.md`

### Observaciones

- Web:
  - `ObservacionesScreen.tsx`
  - `hooks/useObservaciones.ts`
  - `components/observaciones/*`
- API:
  - `routes/observaciones.ts`
  - `services/observaciones/observacionesPrisma.ts`
- Tipos:
  - `packages/tipos/src/observacion.ts`

### Precipitaciones

- Web:
  - `PrecipitacionesScreen.tsx`
- API:
  - `routes/precipitaciones.ts`
  - `services/precipitaciones/*`
- Tipos:
  - `packages/tipos/src/precipitacion.ts`

### NDVI

- Web:
  - por ahora se consume desde seguimiento operativo.
- API:
  - `routes/ndvi.ts`
  - `services/ndvi/mapasNdviPrisma.ts`
- Tipos:
  - `packages/tipos/src/ndvi.ts`
- Docs:
  - `docs/DISENO_TECNICO_NDVI.md`

### Auditoria

- Web:
  - `AuditoriaScreen.tsx`
- API:
  - `routes/auditoria.ts`
  - `services/auditoria/*`
- Tipos:
  - `packages/tipos/src/auditoria.ts`
- Docs:
  - `docs/AUDITORIA.md`

## Validacion Recomendada

Despues de cambios de frontend:

```bash
pnpm --filter agro-app-web build
```

Despues de cambios de API:

```bash
pnpm --filter agro-app-api build
```

Despues de cambios compartidos:

```bash
pnpm build
```

Si el cambio toca Prisma:

- revisar migracion;
- regenerar Prisma Client si corresponde;
- validar que API compile;
- probar endpoint relacionado.

Ademas del build, cada feature nueva o cambio relevante debe sumar tests automaticos en las capas de mayor riesgo. Si una validacion queda manual de forma temporal, debe quedar documentada junto con el motivo.
