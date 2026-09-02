# Supabase

## Objetivo

Supabase se usa como PostgreSQL remoto para empezar a probar persistencia real sin instalar PostgreSQL local ni Docker.

La aplicacion sigue usando Prisma desde el backend. Web y mobile no se conectan directo a la base: consumen la API propia.

## Conexion

Desde Supabase Dashboard:

1. Entrar al proyecto.
2. Ir a `Connect`.
3. Copiar la cadena `Session pooler`.
4. Crear el schema propio `agro_app`.
5. Pegar la cadena en `.env` como `DATABASE_URL`, agregando `schema=agro_app`.

Formato esperado:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require&schema=agro_app"
```

Si la URL copiada desde Supabase no trae parametros, agregar `?schema=agro_app`.

Si ya trae parametros, por ejemplo `?sslmode=require`, agregar `&schema=agro_app`.

Para este proyecto conviene usar `Session pooler` en desarrollo porque:

- funciona en redes IPv4;
- es compatible con un backend Express persistente;
- evita depender de PostgreSQL local;
- permite correr Prisma contra una base real.

Si mas adelante se despliega el backend en un entorno serverless, se evaluara `Transaction pooler` y los ajustes necesarios para Prisma.

## Migraciones

Con `.env` configurado:

Primero crear el schema desde Supabase SQL Editor:

```sql
create schema if not exists agro_app;
```

Luego aplicar Prisma:

```powershell
pnpm --filter agro-app-api prisma:validate
pnpm --filter agro-app-api prisma:generate
pnpm --filter agro-app-api db:deploy
pnpm --filter agro-app-api db:seed
```

`db:deploy` aplica las migraciones existentes en Supabase. No crea una migracion nueva.

## Seguridad

- No commitear `.env`.
- No exponer `DATABASE_URL` en web ni mobile.
- No usar la key `service_role` en clientes publicos.
- Las credenciales de Supabase deben vivir solo en backend o en secretos del entorno de despliegue.
- Mantener `SECRETS_ENCRYPTION_KEY` fuera del repositorio y con un valor fuerte.
- Web y mobile deben llamar a la API propia, nunca directo a tablas sensibles.

## Pendiente

- Evaluar RLS si se exponen tablas mediante Data API.
- Revisar politicas antes de habilitar acceso directo desde frontend.
- Definir manejo de backups y rotacion de credenciales para ambientes productivos.
