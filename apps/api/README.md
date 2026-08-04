# API Agro App

## Variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus valores reales.

```bash
copy .env.example .env
```

## Migraciones de Prisma

Una vez que tengas PostgreSQL corriendo, ejecuta:

```bash
pnpm --filter agro-app-api exec prisma migrate dev --name init
```

## Ejecutar la API

```bash
pnpm --filter agro-app-api dev
```
