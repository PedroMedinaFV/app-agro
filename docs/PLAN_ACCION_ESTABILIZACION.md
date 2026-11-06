# Plan de accion de estabilizacion

Fecha de inicio: 2026-11-06. Alcance acordado: estabilizar Agro App por etapas con documentacion funcional/tecnica, pruebas proporcionales al riesgo y criterios SOLID aplicados a responsabilidades y dependencias reales.

## Etapas y cierre

| Etapa | Acciones | Criterio de cierre | Estado |
| --- | --- | --- | --- |
| 1. Base de estabilidad | Resolver discrepancia de destinos; actualizar README, arquitectura y comandos | Suite verde, builds correctos y guia de inicio coherente con el codigo | Completada el 2026-11-06; evidencia en `ESTABILIDAD_MVP.md` |
| 2. Autenticacion y errores | Centralizar JWT, exigir secreto valido, validar login/registro y propagar errores sin exponer detalles internos | Pruebas de configuracion ausente, entradas invalidas, credenciales y errores de infraestructura | Implementada y probada el 2026-11-06; actualizar JWT_SECRET local antes de arrancar |
| 3. Integridad offline | Separar cola por cliente/usuario, serializar escrituras, impedir sincronizacion de pendientes ajenos y persistir progreso de adjuntos | Pruebas de cambio de usuario, concurrencia, errores parciales y reintentos; validacion en dispositivo | Pendiente |
| 4. Concurrencia ERP | Bloqueo persistente por cliente, vencimiento, recuperacion y trazabilidad | Dos instancias no sincronizan el mismo cliente simultaneamente; interrupciones no dejan bloqueo permanente | Pendiente |
| 5. Integracion | Base exclusiva de testing, migraciones, recorridos HTTP con middleware real y aislamiento entre clientes/campos | Flujos criticos completos aprobados sin datos operativos reales | Pendiente |
| 6. Modularizacion y entrega | Separar responsabilidades restantes en mobile y servicios criticos; automatizar verificaciones; documentar despliegue y recuperacion | Verificaciones reproducibles y modulos con contratos y dependencias comprensibles | Pendiente |

La modularizacion necesaria para una correccion se realiza dentro de su etapa. La etapa 6 aborda lo restante; no se posterga la calidad de las etapas anteriores.

## Entrega por etapa

- Implementacion acotada a los objetivos de la etapa.
- Pruebas de comportamiento proporcionales al riesgo y compilaciones pertinentes.
- Documentacion de proposito, flujo, reglas, permisos, contratos, persistencia y operacion cuando correspondan.
- Decisiones relevantes con fundamentos y consecuencias.
- Resultados verificables y pendientes explicitos; compilar no equivale a validar integraciones o funcionamiento en dispositivo.

Ver [CALIDAD_TESTS_MODULARIZACION.md](CALIDAD_TESTS_MODULARIZACION.md) para los criterios de codigo y documentacion, y [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md) para la evidencia vigente.

## Entrega de etapa 1

- `prepararDestinoReferencia` conserva el nombre visible limpio y recalcula la clave de identidad. Reutiliza `limpiarTextoVisible` y `normalizarTexto`; no agrega infraestructura ni modifica contratos.
- La prueba existente vuelve a pasar y una regresion comprueba variantes de escritura y una clave incorrecta enviada por cliente.
- README actualizado con setup local, seed de administrador, comandos de desarrollo, validacion e indice documental.
- Arquitectura actualizada con mobile, almacenamiento local, transporte HTTP y endpoints correctos de sincronizacion. El archivo raiz `ARQUITECTURA.md` remite al documento vigente.
- Reglas de destinos y consecuencias sobre registros existentes documentadas en `PLANIFICACION_AGRICOLA.md` y `DECISIONES.md`.
- Criterios SOLID y documentacion incorporados a la guia de calidad.

No se aplican migraciones ni correcciones masivas a datos existentes en esta etapa. La validacion del setup desde una instalacion limpia y los smoke tests contra servicios reales siguen pendientes; no son evidencia cubierta por la compilacion o la suite actual.

## Entrega de etapa 2

- Configuracion JWT unica, sin secreto por defecto, con minimo de 32 bytes y validacion antes de abrir el puerto.
- Servicio comun de firma/verificacion HS256, ocho horas y validacion de claims. El archivo legacy de refresh comparte el servicio y permanece sin publicar.
- Cargador `.env` reutilizado por Prisma, respetando la prioridad del entorno incluso para valores vacios.
- Validaciones de body, email, nombre, password y tipo/tamano de token Microsoft antes de consultar infraestructura. Los contratos de sesion se mantienen.
- Adaptador reutilizable de handlers async para Express 4 y respuestas genericas ante errores 5xx; JSON malformado devuelve 400 sin reproducir su cuerpo.
- Pruebas de arranque, HTTP con middleware real y dependencias de datos/proveedor sustituidas, configuracion y reglas de autenticacion. Resultado: 244/244 y build completo correcto.
- Guia funcional/tecnica, operacion y compatibilidad en [AUTENTICACION.md](AUTENTICACION.md); evidencia en [ESTABILIDAD_MVP.md](ESTABILIDAD_MVP.md).

Pendiente operativo local: configurar una clave JWT valida. La clave privada existente no se modifico ni expuso; su rotacion requiere considerar sesiones y el fallback de cifrado ERP explicado en la guia. No se ejecutaron conexiones reales a base/Microsoft ni migraciones.
