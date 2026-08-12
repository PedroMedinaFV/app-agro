# API Agro App

## Variables de entorno

Copia el archivo `.env.example` a `.env` en la raiz del proyecto y configura tus valores reales.

```bash
copy .env.example .env
```

Si ejecutas comandos de Prisma desde `apps/api`, usa la misma `DATABASE_URL` del archivo `.env`.

## Base de datos local

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
EXPO_PUBLIC_MICROSOFT_CLIENT_ID="..."
```

Para desarrollo mobile, registra este redirect URI:

```text
agroapp://auth
```
