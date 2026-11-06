# Plan de accion de estabilizacion

Fecha de inicio: 2026-11-06. Alcance acordado: estabilizar Agro App por etapas con documentacion funcional/tecnica, pruebas proporcionales al riesgo y criterios SOLID aplicados a responsabilidades y dependencias reales.

## Etapas y cierre

| Etapa | Acciones | Criterio de cierre | Estado |
| --- | --- | --- | --- |
| 1. Base de estabilidad | Resolver discrepancia de destinos; actualizar README, arquitectura y comandos | Suite verde, builds correctos y guia de inicio coherente con el codigo | Completada el 2026-11-06; evidencia en `ESTABILIDAD_MVP.md` |
| 2. Autenticacion y errores | Centralizar JWT, exigir secreto valido, validar login/registro y propagar errores sin exponer detalles internos | Pruebas de configuracion ausente, entradas invalidas, credenciales y errores de infraestructura | Implementada y probada el 2026-11-06; JWT de desarrollo actualizado en etapa 3 |
| 3. Integridad offline | Separar cola por cliente/usuario, serializar escrituras, impedir sincronizacion de pendientes ajenos y persistir progreso de adjuntos | Pruebas de cambio de usuario, concurrencia, errores parciales y reintentos; validacion en dispositivo | Implementada con pruebas automaticas; pendiente recorrido en dispositivo |
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

El pendiente de JWT local detectado al cerrar etapa 2 se resolvio en etapa 3 con autorizacion del usuario, preservando el material de cifrado ERP. No se expusieron claves ni se ejecutaron migraciones o conexiones reales a base/Microsoft.

## Entrega de etapa 3

- Cola persistente versionada por cliente/usuario; validacion de propietario e integridad al leer. Los registros globales anteriores se conservan sin atribuirlos a la sesion actual.
- Exclusiones compartidas por cola dentro del runtime para mutaciones y sincronizaciones. Fallos no bloquean futuras operaciones y cargas nuevas durante un envio no se pierden.
- Guardado previo al primer envio con ID estable, usando la idempotencia existente del backend. Sin persistencia confirmada no se envia ni se limpia el formulario.
- Progreso de adjuntos persistido despues de cada PUT; reintentos reutilizan metadata confirmada. Cambio de sesion detiene nuevas solicitudes y no actualiza datos/pantallas de otra cuenta.
- Contratos, nucleo de cola/sincronizacion y adaptadores separados. Pruebas sobre el mismo nucleo compilado, sin dependencias de React Native.
- JWT de desarrollo rotado con clave aleatoria; compatibilidad del material de cifrado comprobada localmente sin mostrar valores. Requiere reiniciar API y volver a iniciar sesion.
- Resultado: 258/258 pruebas; TypeScript mobile y build completo correctos. Guia tecnica/funcional en [OFFLINE.md](OFFLINE.md).

La etapa no se considera cerrada respecto de su criterio manual: falta el recorrido de [MOBILE_TESTING.md](MOBILE_TESTING.md) con dispositivo, fotos reales y servicios de testing. No hay dispositivo/emulador disponible en este entorno. Tampoco se valida aqui coordinacion entre pestanas, recuperacion automatica de registros legacy o arranque completamente offline.
