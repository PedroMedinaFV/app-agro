# Agro App

Monorepo para una aplicacion agricola de campo, con backend en TypeScript, web React + Vite, mobile Expo/React Native y contratos compartidos.

## Estructura

- `apps/api`: API en Node.js + TypeScript.
- `apps/web`: aplicacion web React + Vite para validar pantallas y flujos.
- `apps/mobile`: aplicacion mobile Expo/React Native para uso en campo.
- `packages/tipos`: tipos compartidos entre backend, web y mobile.
- `docs`: documentacion viva del MVP, flujos y decisiones.
  - `docs/ROLES_Y_PERMISOS.md`: matriz inicial de permisos.

## Comandos

```bash
pnpm install
pnpm --filter agro-app-web dev
pnpm --filter agro-app-mobile dev
pnpm --filter agro-app-api dev
pnpm build
```

## Desarrollo actual

La web es el entorno principal de validacion rapida:

```bash
pnpm --filter agro-app-web dev
```

Abrir `http://localhost:5173`.

La API acompana los contratos, pero la persistencia real queda pendiente hasta tener PostgreSQL disponible.
