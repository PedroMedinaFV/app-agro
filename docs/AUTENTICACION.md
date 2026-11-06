# Autenticacion y manejo de errores

Actualizado: 2026-11-06, etapa 2 de estabilizacion.

## Proposito y alcance

Web y mobile intercambian credenciales por una sesion de Agro App. La API valida entradas, autentica y entrega un JWT con usuario, rol y cliente; los permisos se calculan con `@agro/tipos`. Las rutas protegidas verifican el token antes de ejecutar permisos y reglas de alcance.

Se mantienen los contratos existentes de sesiones y endpoints. No hay migraciones de base ni nuevas dependencias. Esta etapa no implementa recuperacion de password, revocacion inmediata, rate limiting ni nuevas politicas de alta de usuarios.

## Configuracion y arranque

`JWT_SECRET` es obligatorio en todos los entornos. Debe tener al menos 32 bytes UTF-8 despues de recortar extremos para la comprobacion de longitud; el material de firma se usa tal como fue configurado. La longitud no garantiza entropia: generar una clave aleatoria propia, sin copiar las claves de tests.

Generacion local (el resultado es un secreto y debe guardarse en el entorno del servidor):

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Colocar el resultado en `JWT_SECRET` del `.env` raiz o en el gestor de secretos del despliegue y reiniciar la API. Nunca usar una variable `VITE_*` o `EXPO_PUBLIC_*` para este secreto. `.env.example` lo deja vacio deliberadamente.

`config/cargarEnvRaiz.ts` completa solo las variables ausentes. Los valores ya definidos por el proceso prevalecen sobre `.env`, incluso si son vacios: una clave vacia debe fallar, no recuperar silenciosamente un valor local. Prisma reutiliza este cargador indicando la raiz a partir de su ubicacion; los CLI conservan la busqueda desde su directorio de trabajo.

`src/index.ts` valida la configuracion antes de crear la app y abrir el puerto. Firma, verificacion y el codigo legacy de refresh consultan la misma configuracion. No existe fallback `secret-dev` en estas operaciones.

## JWT y permisos

- Firma y verificacion restringidas a `HS256`.
- Sesiones emitidas por Agro App con duracion de ocho horas.
- Claims: `sub` y `email` obligatorios; `rol` y `clienteId` opcionales de tipo texto. La verificacion exige `exp` y rechaza tokens expirados, firmas ajenas, otro algoritmo y payloads incompatibles.
- Sin rol se conserva el comportamiento de `operador_campo`; los permisos y el alcance por cliente/campo siguen siendo responsabilidad del backend.
- No se consulta la base en cada verificacion: un cambio de rol no revoca inmediatamente un JWT ya emitido.
- `routes/refresh.ts` usa el servicio comun y conserva rol/cliente, pero sigue sin montarse en `index.ts`. Esta etapa no publica un endpoint de renovacion.

## Endpoints y validaciones

| Endpoint | Entrada y reglas | Resultado |
| --- | --- | --- |
| `POST /auth/registro` | Objeto con email valido de hasta 254 caracteres, password de al menos ocho caracteres y hasta 72 bytes UTF-8; nombre opcional de hasta 200 caracteres | `201` con sesion; `400` ante entrada invalida o email existente |
| `POST /auth/login` | Objeto con email valido y password no vacio de hasta 72 bytes UTF-8 | `200` con sesion; `401` ante credenciales incorrectas o cuenta sin password local |
| `POST /auth/microsoft` | `idToken` de texto no vacio y hasta 16384 caracteres; debe superar la validacion criptografica existente de Microsoft | `200` con sesion; `400` ante entrada ausente/invalida; `403` si el usuario no esta habilitado o esta enlazado a otra identidad |

El backend recorta y convierte el email a minusculas. El nombre se limpia con los helpers existentes. El password se conserva exactamente, incluidos espacios: no se debe recortar ni normalizar. El limite de 72 bytes evita la truncacion silenciosa de bcrypt. El login no exige el minimo nuevo de ocho caracteres para permitir credenciales historicas cortas.

Los campos adicionales del body no se pasan a la creacion de usuario: el cliente no puede elegir rol o cliente por este endpoint. El registro publico conserva su comportamiento previo y no asigna automaticamente un cliente. Para dar acceso operativo usar el alta administrativa con cliente y permisos correspondientes.

Las respuestas exitosas mantienen `mensaje`, `token`, `usuario`, `origen` y `permisos`; nunca incluyen el hash del password. Las rutas protegidas siguen usando `Authorization: Bearer <token>` y responden `401` si falta o no es valido.

## Responsabilidades y flujo

| Modulo | Responsabilidad |
| --- | --- |
| `config/jwt.ts` | Validar clave y centralizar algoritmo/duracion |
| `services/seguridad/sesionJwt.ts` | Emitir y verificar tokens de sesion |
| `services/seguridad/validacionesAuth.ts` | Validar entradas desconocidas antes de consultar datos o ejecutar bcrypt |
| `routes/auth.ts` | Coordinar autenticacion con dependencias explicitas y serializar sesiones; `crearRouterAuth` permite sustituir resolvers en pruebas HTTP |
| `middleware/rutaAsincrona.ts` | Propagar excepciones sincronas y rechazos asincronos a Express 4 mediante `next` |
| `middleware/autenticacion.ts` | Validar Bearer y adjuntar claims a la request |
| `middleware/manejadorErrores.ts` | Convertir errores en respuestas HTTP seguras |

Flujo: request -> parser JSON -> router -> validacion -> busqueda/hash/comparacion o proveedor -> servicio JWT -> respuesta. Los fallos viajan por `rutaAsincrona` al middleware central. Se reutilizan helpers de texto existentes, sin introducir nuevas capas de persistencia.

## Errores

- JSON malformado: `400` con mensaje fijo, sin reproducir el cuerpo recibido.
- Body excesivo: `413`, manteniendo la respuesta operativa existente.
- Errores controlados con `statusCode` entero entre 400 y 499: mensaje publico en `error` y `detalle` para compatibilidad. Sus mensajes deben ser aptos para el usuario y no contener secretos.
- Errores de servidor (500 a 599) o codigos invalidos: respuesta generica `{ "error": "Error interno del servidor" }`, sin `detalle`, stack ni mensaje de infraestructura. El detalle queda en los logs del servidor, que requieren acceso restringido.
- Si los headers ya fueron enviados, se delega al siguiente manejador sin intentar una segunda respuesta.

Los errores tecnicos del validador Microsoft existente se propagan y reciben la respuesta generica de servidor; esta etapa valida el tipo/tamano de su entrada y no rediseña la clasificacion de errores del proveedor. El frontend debe usar `error` como fallback si no existe `detalle`, como ya hace el cliente web.

## Actualizacion de un entorno existente

1. Revisar que el proceso no este inyectando una clave antigua, corta o vacia que prevalezca sobre el archivo local.
2. Configurar una clave JWT aleatoria valida. Rotarla invalida las sesiones previas: los usuarios deben volver a iniciar sesion.
3. Antes de rotar, revisar `SECRETS_ENCRYPTION_KEY`: el cifrado ERP existente puede usar `JWT_SECRET` como fallback. Si hay secretos cifrados con esa clave, preservar el material anterior como clave de cifrado independiente o planificar su recifrado antes de cambiarla. Esta etapa no modifica el cifrado ERP ni rota secretos automaticamente.
4. Reiniciar y verificar arranque y login. No se debe restaurar el fallback para resolver un fallo de configuracion.

Durante la etapa 2 no se modifico el `.env` privado. En la etapa 3, el 2026-11-06 y con autorizacion del usuario para desarrollo, se genero una clave aleatoria de 32 bytes (representada en hexadecimal) y se actualizo `JWT_SECRET`. Se verifico que el material efectivo de cifrado ERP permaneciera igual mediante cifrado/descifrado local antes y despues. No se expuso el secreto, no se modificaron registros de base y `.env` continua ignorado por Git. Reiniciar la API y volver a iniciar sesion; las sesiones anteriores no verifican con la nueva clave. Esta comprobacion no es una prueba de conexion real con el ERP.

Credenciales historicas de mas de 72 bytes ahora se rechazan en login. Si existen, requieren restablecimiento mediante el proceso administrativo disponible; esta etapa no cambia hashes existentes. Los emails historicos con capitalizacion no normalizada pueden requerir una correccion controlada de datos; no se realiza una migracion masiva.

## Verificacion

Ejecutar `pnpm test` desde la raiz. La suite compila previamente tipos y API.

| Archivo | Escenarios cubiertos |
| --- | --- |
| `tests/jwt-configuracion.test.js` | Clave ausente/vacia/corta y arranque real fallido antes de abrir el puerto, aun existiendo `.env` |
| `tests/cargar-env.test.js` | Prioridad del proceso y carga de variables ausentes |
| `tests/sesion-jwt.test.js` | Firma, claims, duracion, expiracion, firma ajena y algoritmo incorrecto |
| `tests/auth-validaciones.test.js` | Cuerpos/tipos invalidos, normalizacion, password exacto y limites de bcrypt/nombre/token |
| `tests/auth-http.test.js` | HTTP real con Express/parser/router/middleware: 400, 401, 413, sesiones exitosas y fallos de infraestructura sin filtrar detalles |
| `tests/auth-email.test.js`, `tests/auth-microsoft.test.js` | Flujos existentes de credenciales, alta previa y enlace Microsoft |
| `tests/middleware-autenticacion.test.js`, `tests/middleware-errores.test.js` | Bearer, permisos de paso, respuestas publicas, codigos invalidos y headers enviados |

Las pruebas HTTP usan dependencias de datos/proveedor sustituidas y puertos locales efimeros: no requieren base ni credenciales Microsoft. La configuracion valida, las migraciones y los recorridos con PostgreSQL/Microsoft reales se verifican en el ambiente objetivo y siguen pendientes. No se valida una nueva politica de revocacion, alta publica o proteccion contra fuerza bruta en esta etapa.
