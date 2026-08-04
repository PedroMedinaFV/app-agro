# Dependencias del proyecto

Este documento describe para qué se utilizará cada dependencia del proyecto Agro App.

## Backend

### Express
- Framework para crear la API REST del backend.
- Se usará para manejar rutas, middlewares y controladores.

### CORS
- Permite que la API sea consumida desde diferentes origenes, como la app web o móvil.

### body-parser
- Permite leer el cuerpo de las solicitudes JSON en Express.

### TypeScript
- Lenguaje principal para el backend.
- Mejora la seguridad de tipos y la mantenibilidad del código.

### ts-node-dev
- Ejecuta el backend en modo desarrollo con reinicio automático.
- Útil para probar cambios rápidamente.

## Base de datos

### Prisma
- ORM para interactuar con PostgreSQL de forma segura y tipada.
- Se usará para definir el esquema de datos, migraciones y consultas.

### @prisma/client
- Cliente generado por Prisma para acceder a la base de datos desde TypeScript.

## Frontend

### React Native
- Framework para construir la app móvil y web.
- Se usará para las pantallas y la lógica de negocio de la interfaz.

### Expo
- Herramienta para trabajar con React Native de forma más sencilla.
- Útil para desarrollo rápido y soporte web.

## Compartidos

### @agro/tipos
- Paquete interno con los tipos compartidos entre backend y frontend.
- Se usará para mantener consistencia entre modelos y estructuras de datos.

## Futuras dependencias recomendadas

- `bcrypt` para autenticación de usuarios
- `jsonwebtoken` para manejo de tokens JWT
- `axios` para consumir la API desde la app
- `react-navigation` para navegación entre pantallas
- `react-native-maps` para mapas georreferenciados
- `sqlite` o `watermelondb` para almacenamiento offline
- `zustand` o `redux` para manejo de estado

## Buenas prácticas

- Mantener las dependencias organizadas por capa: backend, frontend y compartidas.
- Documentar cualquier nueva dependencia al agregarla al proyecto.
- Preferir paquetes ampliamente usados y bien mantenidos.
- Revisar la compatibilidad entre herramientas antes de integrar nuevas tecnologías.
