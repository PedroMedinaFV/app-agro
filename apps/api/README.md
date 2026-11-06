# API Agro App

## Variables de entorno

Copia el archivo `.env.example` a `.env` en la raiz del proyecto y configura tus valores reales.

```bash
copy .env.example .env
```

Si ejecutas comandos de Prisma desde `apps/api`, usa la misma `DATABASE_URL` del archivo `.env`.

La API exige `JWT_SECRET` de al menos 32 bytes; `.env.example` lo deja vacio. Las variables del proceso prevalecen sobre `.env`, incluso vacias. Sin clave valida el servidor falla antes de abrir el puerto. Ver [autenticacion](../../docs/AUTENTICACION.md) para generacion, rotacion, compatibilidad con el cifrado ERP y validaciones de login/registro.

## Base de datos local

La sincronizacion ERP requiere la tabla de la migracion `20261106120000_bloqueo_sincronizacion_erp`. `ERP_SYNC_LOCK_TTL_MS` configura su limite (default cinco minutos). Los CLI de sincronizacion requieren clienteId. Ver [concurrencia ERP](../../docs/ERP_CONCURRENCIA.md) para aplicar migraciones, recuperacion y pruebas aisladas.

La configuracion por defecto usa PostgreSQL local en el puerto 5432.

```bash
docker compose up -d postgres
```

## Migraciones de Prisma

Una vez que tengas PostgreSQL corriendo, ejecuta:

```bash
pnpm --filter agro-app-api db:migrate
pnpm --filter agro-app-api db:seed
```

## Ejecutar la API

```bash
pnpm --filter agro-app-api dev
```

## Login Microsoft

Configura una App Registration en Microsoft Entra ID y usa el mismo Application/Client ID en:

```bash
MICROSOFT_CLIENT_ID="..."
VITE_MICROSOFT_CLIENT_ID="..."
EXPO_PUBLIC_MICROSOFT_CLIENT_ID="..."
```

Para desarrollo web, registra este redirect URI como Single-page application:

```text
http://localhost:5173
```

La web usa Vite y lee las variables `VITE_*` desde el `.env` de la raiz del monorepo. Despues de cambiar `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID` o `VITE_MICROSOFT_REDIRECT_URI`, hay que reiniciar `pnpm --filter agro-app-web dev`.

Para desarrollo mobile, registra este redirect URI:

```text
agroapp://auth
```
