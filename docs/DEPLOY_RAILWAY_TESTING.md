# Deploy Testing En Railway

Guia para desplegar la rama `testing` en Railway y usar ese entorno como banco de prueba de performance, integraciones y comportamiento real fuera de local.

## Objetivo

Tener un entorno `testing` con:

- API desplegada en Railway.
- Web desplegada en Railway.
- PostgreSQL en Supabase, la misma estrategia que venimos usando en local.
- Variables separadas de local.
- Migraciones Prisma aplicadas antes de levantar la API.
- URL publica para validar tiempos de carga y funcionalidades.

## Arquitectura Del Deploy

Railway debe tener un proyecto con dos servicios de app. La base PostgreSQL se mantiene en Supabase.

```txt
Railway Project: agro-app-testing

  API
    -> apps/api
    -> Express + Prisma
    -> usa DATABASE_URL de Supabase
    -> expone https://api-testing.up.railway.app

  WEB
    -> apps/web
    -> React/Vite
    -> usa VITE_API_URL=https://api-testing.up.railway.app
    -> expone https://web-testing.up.railway.app
```

Como el repo es un monorepo con PNPM workspaces, conviene configurar dos servicios de app separados, ambos apuntando al mismo repo/rama `testing`, pero con comandos diferentes.

Supabase:

```txt
Supabase Project
  PostgreSQL
    -> DATABASE_URL
    -> schema recomendado para testing: agro_app_testing
```

## Rama

La rama de deploy sera:

```bash
testing
```

Flujo recomendado:

```bash
git checkout testing
git merge main
git push origin testing
```

Railway deberia autodesplegar desde `testing`, no desde `main`, para que podamos probar cambios sin afectar el flujo estable.

## Variables

### API

Variables minimas para el servicio API:

```env
DATABASE_URL=<supabase-postgres-url>
JWT_SECRET=<secret-largo-y-distinto-a-local>
SECRETS_ENCRYPTION_KEY=<secret-largo-y-distinto-a-local>
PORT=4000
API_JSON_LIMIT=2mb
```

Para Supabase, usar preferentemente la URL del pooler/session pooler con SSL y schema separado para testing:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require&schema=agro_app_testing"
```

La parte importante es `schema=agro_app_testing`: permite probar Railway sin pisar el schema local o cualquier otro entorno.

Variables de Microsoft, si se prueba login Microsoft:

```env
MICROSOFT_CLIENT_ID=<app-client-id>
MICROSOFT_TENANT_ID=common
```

Variables ERP, si se prueba sincronizacion real:

```env
ERP_BASE_URL=<url-erp>
ERP_AUTH_BASE_URL=<url-auth-erp-si-aplica>
ERP_AUTH_MODE=<mock|api_key|bearer|basic|login>
ERP_API_KEY=<si-aplica>
ERP_API_KEY_HEADER=x-api-key
ERP_BEARER_TOKEN=<si-aplica>
ERP_USERNAME=<si-aplica>
ERP_PASSWORD=<si-aplica>
ERP_LOGIN_KEY=<si-aplica>
ERP_LOGIN_PASSWORD=<si-aplica>
ERP_LOGIN_APP=<si-aplica>
ERP_LOGIN_INSTALLATION=<si-aplica>
ERP_TOKEN_HEADER=Authorization
ERP_TOKEN_PREFIX=Bearer
ERP_TIMEOUT_MS=15000
ERP_PAGE_SIZE=500
ERP_NO_PAGINATE=false
```

Variables de adjuntos/geografia, si se prueban archivos:

```env
SUPABASE_URL=<url-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OBSERVACION_ADJUNTO_BUCKET=observaciones
OBSERVACION_ADJUNTO_MAX_CANTIDAD=5
OBSERVACION_ADJUNTO_MAX_BYTES=10485760
OBSERVACION_ADJUNTO_UPLOAD_EXPIRES_SECONDS=600
OBSERVACION_ADJUNTO_READ_EXPIRES_SECONDS=300
LOTE_GEOGRAFIA_BUCKET=lotes-geograficos
LOTE_GEOGRAFIA_MAX_BYTES=26214400
LOTE_GEOGRAFIA_UPLOAD_EXPIRES_SECONDS=600
```

Variables opcionales para crear usuario inicial con seed:

```env
SEED_CLIENTE_ID=cliente-testing
SEED_CLIENTE_NOMBRE=Cliente Testing
SEED_ADMIN_EMAIL=admin-testing@agroapp.local
SEED_ADMIN_PASSWORD=<password-temporal-segura>
SEED_ADMIN_NOMBRE=Admin Testing
```

### Web

Variables minimas para el servicio web:

```env
VITE_API_URL=https://<url-publica-api-railway>
VITE_MICROSOFT_CLIENT_ID=<app-client-id-si-aplica>
VITE_MICROSOFT_TENANT_ID=common
VITE_MICROSOFT_REDIRECT_URI=https://<url-publica-web-railway>
```

Importante: `VITE_API_URL` se inyecta en build time. Si cambia la URL de la API, hay que redeployar la web.

## Base De Datos Supabase

No crear PostgreSQL en Railway para este entorno. La API de Railway debe usar `DATABASE_URL` de Supabase.

Recomendacion:

1. Usar el mismo proyecto Supabase si queremos comparar con local.
2. Crear un schema separado para testing, por ejemplo `agro_app_testing`.
3. Configurar `DATABASE_URL` con `schema=agro_app_testing`.
4. Aplicar migraciones con `prisma migrate deploy`.
5. Ejecutar seed inicial si hace falta.

Para testing conviene empezar con una DB limpia. Si se borra y recrea la DB, volver a correr:

```bash
pnpm --filter agro-app-api db:deploy
pnpm --filter agro-app-api db:seed
```

En Railway eso se puede hacer desde consola/CLI usando variables del entorno, pero siempre apuntando a la URL de Supabase.

## Servicio API

Crear un servicio desde GitHub apuntando al repo y rama `testing`.

### Settings Recomendados

Root directory:

```txt
/
```

Build command:

```bash
pnpm --filter agro-app-api prisma:generate && pnpm --filter agro-app-api build
```

Pre-deploy command:

```bash
pnpm --filter agro-app-api db:deploy
```

Start command:

```bash
node apps/api/dist/index.js
```

Healthcheck path:

```txt
/home
```

Si `/home` requiere ajustes o no responde como healthcheck simple, crear mas adelante un endpoint dedicado:

```txt
/health
```

### Notas

- `db:deploy` usa `prisma migrate deploy`, pensado para aplicar migraciones ya versionadas.
- No usar `migrate dev` en Railway.
- No correr `db:clean:dev` en Railway salvo que sea un entorno descartable y se haga conscientemente.
- La API escucha el `PORT` que Railway provee o el fallback `4000`.

## Servicio Web

Crear otro servicio desde el mismo repo y rama `testing`.

### Settings Recomendados

Root directory:

```txt
/
```

Build command:

```bash
pnpm --filter agro-app-web build
```

Start command:

```bash
pnpm --filter agro-app-web preview -- --host 0.0.0.0 --port $PORT
```

Variables:

```env
VITE_API_URL=https://<url-publica-api-railway>
VITE_MICROSOFT_REDIRECT_URI=https://<url-publica-web-railway>
```

### Nota Sobre Web Estatica

`vite preview` sirve para validar testing, pero para un entorno mas formal podria convenir servir `dist` con un servidor estatico como `serve` o `nginx`. Para esta etapa, `vite preview` es suficiente si Railway lo mantiene estable.

## Microsoft Login

Si se prueba Microsoft en Railway:

1. Ir al portal de Azure.
2. Agregar redirect URI de web testing:

```txt
https://<url-publica-web-railway>
```

3. Configurar en Railway:

```env
MICROSOFT_CLIENT_ID=<client-id>
MICROSOFT_TENANT_ID=common
VITE_MICROSOFT_CLIENT_ID=<client-id>
VITE_MICROSOFT_TENANT_ID=common
VITE_MICROSOFT_REDIRECT_URI=https://<url-publica-web-railway>
```

4. Redeployar API y web.

## Seed Inicial

El seed actual no carga datos mock masivos; crea cliente/admin si se pasan variables.

Para correr seed en Railway:

```bash
pnpm --filter agro-app-api db:seed
```

Variables necesarias:

```env
SEED_CLIENTE_ID=cliente-testing
SEED_CLIENTE_NOMBRE=Cliente Testing
SEED_ADMIN_EMAIL=admin-testing@agroapp.local
SEED_ADMIN_PASSWORD=<password-temporal-segura>
SEED_ADMIN_NOMBRE=Admin Testing
```

Despues del primer ingreso, cambiar la password temporal.

## Checklist De Deploy

### Antes

- [ ] Rama `testing` creada y pusheada.
- [ ] `pnpm build` pasa localmente.
- [ ] Migraciones Prisma commiteadas.
- [ ] `.env.example` actualizado si se agregaron variables.
- [ ] Schema Supabase de testing definido, por ejemplo `agro_app_testing`.
- [ ] `DATABASE_URL` de Supabase armado con `schema=agro_app_testing`.
- [ ] Decidir si el ERP va en `mock` o real.
- [ ] Definir usuario admin inicial.

### Railway

- [ ] Proyecto `agro-app-testing` creado.
- [ ] No crear PostgreSQL en Railway.
- [ ] Servicio API creado desde rama `testing`.
- [ ] Servicio WEB creado desde rama `testing`.
- [ ] `DATABASE_URL` de Supabase cargado en API.
- [ ] Variables API cargadas.
- [ ] Variables WEB cargadas.
- [ ] API build command configurado.
- [ ] API pre-deploy command configurado.
- [ ] API start command configurado.
- [ ] WEB build command configurado.
- [ ] WEB start command configurado.
- [ ] URL API copiada a `VITE_API_URL`.
- [ ] Redirect URI Microsoft configurada si aplica.

### Despues

- [ ] API responde `/home`.
- [ ] Web abre correctamente.
- [ ] Login email/password funciona.
- [ ] Login Microsoft funciona, si aplica.
- [ ] Sincronizacion ERP funciona, si aplica.
- [ ] Planificacion carga mas rapido que local.
- [ ] Protocolos crean/editan sin timeout.
- [ ] Monitoreos abre sin error.
- [ ] Observaciones y precipitaciones guardan.
- [ ] Auditoria registra cambios.

## Validaciones Funcionales Para Testing

1. Login:
   - entrar con admin creado por seed;
   - validar logout;
   - validar expiracion de sesion.

2. ERP:
   - configurar integracion;
   - probar conexion;
   - sincronizar padrones;
   - verificar empresas, zonas, campos, lotes, actividades, especies, insumos, servicios, monedas y campanias.

3. Planificacion:
   - crear escenario;
   - elegir campania real;
   - validar que lotes traen superficie productiva;
   - asignar protocolo;
   - validar precio por especie/destino;
   - validar gastos por destino/actividad;
   - guardar;
   - editar;
   - cerrar solo cuando corresponda.

4. Protocolos:
   - crear protocolo;
   - agregar etapas;
   - agregar labores/insumos;
   - validar que precios no sean editables desde protocolo;
   - guardar y editar.

5. Operativo:
   - crear recorrida;
   - cargar observacion vinculada;
   - cargar precipitacion;
   - revisar seguimiento operativo.

6. Performance:
   - medir primer login;
   - medir ingreso a planificacion;
   - medir abrir editor de planificacion;
   - medir crear/editar protocolo;
   - medir sincronizacion ERP.

## Troubleshooting

### Web intenta pegarle a localhost

Revisar:

```env
VITE_API_URL=https://<api-railway>
```

Luego redeployar web.

### API falla por Prisma Client

Revisar que el build command tenga:

```bash
pnpm --filter agro-app-api prisma:generate
```

### API falla por tablas inexistentes

Revisar que el pre-deploy command tenga:

```bash
pnpm --filter agro-app-api db:deploy
```

Tambien revisar que `DATABASE_URL` apunte al schema correcto de Supabase. Si apunta a otro schema, Prisma puede no encontrar tablas aunque la base exista.

### Microsoft vuelve al login o falla redirect

Revisar:

- Redirect URI registrada en Azure.
- `VITE_MICROSOFT_REDIRECT_URI`.
- `MICROSOFT_CLIENT_ID`.
- `MICROSOFT_TENANT_ID`.

### CORS

Hoy la API usa `cors()` abierto. Para testing sirve. Antes de produccion conviene restringir origen a la URL web real.

### Sincronizacion ERP lenta

Revisar:

- region de Railway;
- latencia hacia ERP;
- `ERP_TIMEOUT_MS`;
- si endpoints permiten `NoPaginate`;
- logs de `ErpSincronizacion`.

## Comandos Utiles

Build completo local:

```bash
pnpm build
```

Build API:

```bash
pnpm --filter agro-app-api build
```

Build web:

```bash
pnpm --filter agro-app-web build
```

Migraciones testing:

```bash
pnpm --filter agro-app-api db:deploy
```

Seed testing:

```bash
pnpm --filter agro-app-api db:seed
```

API local:

```bash
pnpm --filter agro-app-api dev
```

Web local:

```bash
pnpm --filter agro-app-web dev
```

## Referencias

- Railway Monorepos: https://docs.railway.com/deployments/monorepo
- Railway Build/Start Commands: https://docs.railway.com/builds/build-and-start-commands
- Railway Pre-Deploy Command: https://docs.railway.com/deployments/pre-deploy-command
- Prisma migrate deploy: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
