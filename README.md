# Agro App

Aplicacion de gestion agricola para administracion web y registro de campo desde mobile. Incluye planificacion por campania y escenarios, protocolos productivos, costos comerciales, padrones propios y ERP, recorridas, observaciones, precipitaciones, geografia/NDVI, usuarios, permisos y auditoria.

Estado: MVP en estabilizacion. La API ya persiste datos en PostgreSQL mediante Prisma. La existencia de codigo y tests no implica que las integraciones externas o el uso offline en dispositivo esten validados para produccion.

## Estructura

| Directorio | Responsabilidad |
| --- | --- |
| `apps/api` | API REST Express/TypeScript, servicios de negocio, Prisma e integraciones ERP y Supabase Storage |
| `apps/web` | Administracion React/Vite, pantallas, hooks y componentes reutilizables |
| `apps/mobile` | Expo/React Native, registros operativos y cola local de pendientes |
| `packages/tipos` | Contratos, roles, permisos y helpers compartidos |
| `tests` | Suite Node de validaciones, servicios y resolvers; utiliza la API compilada |
| `scripts` | Utilidades de desarrollo, arranque Expo y comandos Prisma |
| `docs` | Documentacion funcional, tecnica, decisiones y estado de validacion |

## Preparar desarrollo local

Se necesitan Node.js compatible con los paquetes instalados, pnpm y PostgreSQL. Docker Compose permite levantar la base local. El repositorio todavia no fija versiones de Node/pnpm; la etapa 1 se verifico con Node `v24.18.1` y pnpm `11.18.0`. Registrar cambios de herramientas junto con sus verificaciones.

Desde la raiz, en PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env
```

Si `.env` ya existe, conservarlo y comparar las variables con `.env.example`. Configurar `DATABASE_URL`, `JWT_SECRET` y `SECRETS_ENCRYPTION_KEY` con valores propios. `JWT_SECRET` exige al menos 32 bytes y no tiene fallback: sin clave valida la API no abre el puerto. Las variables del proceso prevalecen sobre `.env`, incluso vacias. Consultar [autenticacion y actualizacion de entornos existentes](docs/AUTENTICACION.md) antes de rotar una clave en uso. No versionar secretos. Luego:

```powershell
docker compose up -d postgres
pnpm --filter agro-app-api prisma:generate
pnpm --filter agro-app-api db:migrate
```

`db:migrate` modifica la base seleccionada: en este flujo debe apuntar a una base local de desarrollo.

Para crear el primer administrador, agregar en el `.env` raiz `SEED_CLIENTE_ID`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`; opcionalmente `SEED_CLIENTE_NOMBRE` y `SEED_ADMIN_NOMBRE`. Luego ejecutar:

```powershell
pnpm --filter agro-app-api db:seed
```

Sin las tres variables obligatorias, el seed no crea datos. Si el usuario ya existe, actualiza su cliente, rol y password; utilizarlo solamente sobre el entorno previsto.

## Ejecutar aplicaciones

Abrir una terminal por aplicacion desde la raiz:

```powershell
pnpm --filter agro-app-api dev
pnpm --filter agro-app-web dev
pnpm --filter agro-app-mobile dev
```

API: `http://localhost:4000`. Web: `http://localhost:5173`. El comando mobile inicia Expo en modo web desde el puerto 8082 y busca uno libre si esta ocupado. Para iniciar Expo con sus opciones de dispositivo:

```powershell
pnpm --filter agro-app-mobile exec expo start
```

La web lee `VITE_*` desde el `.env` raiz. Para mobile, exportar `EXPO_PUBLIC_API_URL` en la terminal que inicia Expo o configurar el entorno de Expo en `apps/mobile`; el launcher actual no carga el `.env` raiz. En un telefono usar una URL de API accesible desde su red, ya que `localhost` apunta al propio dispositivo. Reiniciar los procesos al cambiar configuracion.

El ERP, Microsoft Entra ID y Supabase requieren configuracion adicional; consultar sus documentos antes de validar esos flujos. El modo ERP `mock` de `.env.example` no valida una conexion real.

## Verificaciones

```powershell
pnpm test
pnpm --filter agro-app-web build
pnpm --filter agro-app-mobile exec tsc --noEmit
pnpm --filter agro-app-api prisma:validate
```

`pnpm test` compila los tipos y la API antes de ejecutar `tests/*.test.js`. La suite actual es principalmente de unidad/servicio y resolvers; no reemplaza pruebas HTTP completas, migraciones en base de testing ni pruebas en dispositivo.

Para compilar todo el monorepo, ejecutar `pnpm build`: incluye `expo export` para mobile. El chequeo TypeScript de mobile y la exportacion Expo son verificaciones distintas. El script raiz `pnpm lint` todavia no tiene scripts/configuracion de lint en los workspaces y no debe contarse como control de calidad implementado.

## Documentacion para continuar

- [Arquitectura actual](docs/ARQUITECTURA_PROYECTO.md): mapa del codigo y flujos de datos.
- [Calidad, SOLID y documentacion](docs/CALIDAD_TESTS_MODULARIZACION.md): criterios para cambios nuevos y existentes.
- [Plan de accion](docs/PLAN_ACCION_ESTABILIZACION.md): etapas y criterios de cierre.
- [Estado de estabilidad](docs/ESTABILIDAD_MVP.md): evidencia de verificaciones y pendientes.
- [Planificacion agricola](docs/PLANIFICACION_AGRICOLA.md) y [modelo de datos](docs/MODELO_PLANIFICACION_V1.md).
- [Roles y permisos](docs/ROLES_Y_PERMISOS.md), [seguridad](docs/SEGURIDAD.md) y [auditoria](docs/AUDITORIA.md).
- [Autenticacion y errores](docs/AUTENTICACION.md): validaciones, JWT, configuracion y pruebas HTTP.
- [Integracion ERP](docs/INTEGRACION_ERP.md), [Supabase](docs/SUPABASE.md) y [pruebas mobile](docs/MOBILE_TESTING.md).
- [Decisiones](docs/DECISIONES.md): fundamentos y restricciones del producto.

La arquitectura describe el codigo existente; los planes y checklists distinguen lo implementado de lo pendiente. Toda funcionalidad debe mantener actualizados su comportamiento, contratos, reglas, operacion y forma de validacion.
