# Arquitectura del sistema Agro App

## Objetivo

Agro App será una plataforma para gestionar información productiva de múltiples unidades de campo en distintos países, con soporte para móvil y web. La prioridad es que la app móvil funcione en condiciones reales de campo, incluso sin conexión estable.

## Principios de diseño

- Offline-first: la app debe poder registrar información aunque no haya cobertura.
- Resiliencia: los datos no se pierden si la red falla.
- Simplicidad operativa: el backend debe ser claro y fácil de mantener.
- Escalabilidad progresiva: se puede crecer sin reescribir la base.

## Componentes principales

### 1. Frontend móvil
- App móvil basada en React Native CLI.
- Se usará para trabajar en campo.
- Tendrá pantallas para:
  - autenticación
  - dashboard de campos y lotes
  - registro de avances de siembra y cosecha
  - monitoreo y observaciones
  - gestión de labores y análisis de suelo

### 2. Frontend web
- Una interfaz web simple y estable para administración y pruebas.
- Servirá como respaldo y como punto de entrada para operaciones de oficina.

### 3. Backend
- API REST en TypeScript con Express.
- Se encargará de:
  - autenticar usuarios
  - gestionar campos, lotes, cultivos y labores
  - recibir datos sincronizados desde la app móvil
  - exponer datos para la app y la web

### 4. Base de datos
- PostgreSQL como motor principal.
- Prisma como ORM para modelar y consultar los datos.
- La base almacenará información sobre:
  - usuarios
  - países
  - campos
  - lotes
  - cultivos
  - labores
  - análisis de suelo
  - avances de siembra y cosecha
  - monitoreos

## Modelo de funcionamiento offline-first

1. El usuario inicia sesión en la app.
2. La app carga o guarda datos localmente en el dispositivo.
3. El usuario registra información productiva aunque no tenga conexión.
4. Los registros se almacenan como pendientes en la app.
5. Cuando hay conexión, la app sincroniza los datos con el backend.
6. El backend persiste la información en PostgreSQL.
7. La app puede volver a consultar los datos ya sincronizados.

## Capas de la solución

### Capa de presentación
- pantallas, formularios y navegación
- componentes reutilizables
- experiencia adaptada a uso en campo

### Capa de aplicación
- validaciones de negocio
- reglas de creación y edición
- manejo del estado de sincronización

### Capa de dominio
- entidades como Campo, Lote, Labor, Monitoreo
- reglas del negocio agrícola

### Capa de infraestructura
- almacenamiento local del dispositivo
- sincronización con la API
- autenticación y acceso a datos remotos

## Estructura propuesta

- `apps/api`: backend y lógica de acceso a datos.
- `apps/mobile`: interfaz móvil y lógica offline-first.
- `packages/tipos`: modelos y tipos compartidos.
- `public`: interfaz web estática y estable para pruebas rápidas.

## Elementos ya implementados o en marcha

- API Express con rutas de autenticación.
- Soporte inicial para JWT.
- Pantalla web estable para pruebas.
- Capa inicial de registros pendientes para sincronización offline en la app móvil.

## Próximos pasos

- agregar almacenamiento local persistente para registros offline
- definir el flujo de sincronización por lote o por tipo de registro
- crear pantallas de campo para cargar datos sin conexión
- incorporar manejo de conflictos de sincronización
- preparar una estrategia de despliegue para uso real en dispositivos móviles
