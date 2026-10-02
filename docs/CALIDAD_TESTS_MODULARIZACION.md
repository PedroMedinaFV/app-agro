# Calidad, tests y modularizacion

Este documento define reglas obligatorias para que Agro App pueda crecer sin volverse fragil. Aplica a funcionalidades nuevas y a mejoras sobre funcionalidades existentes.

## Principio

Cada feature debe entregar tres cosas juntas:

- comportamiento funcionando;
- tests proporcionales al riesgo;
- codigo modular y reutilizable.

No alcanza con que compile. Una funcionalidad queda realmente lista cuando puede evolucionar sin romper permisos, datos de otros clientes, flujos mobile/offline ni pantallas relacionadas.

## Bloque de tests por feature

Toda feature nueva debe incluir un bloque de tests fuerte. Para features existentes, cada cambio relevante debe agregar o mejorar tests del modulo tocado.

El bloque minimo esperado es:

- tests de reglas puras en `utils`, helpers o servicios sin dependencias externas;
- tests de servicios backend cuando hay validaciones de dominio, permisos, alcance por cliente/campo, auditoria, idempotencia o transacciones;
- tests de contratos/serializacion cuando cambia una respuesta consumida por web o mobile;
- tests de componentes o hooks cuando una pantalla contiene estados complejos, filtros, acciones masivas o flujos de guardado;
- tests de sincronizacion/offline cuando el flujo acepta reintentos, adjuntos, errores parciales o registros pendientes.

Si una capa queda sin test automatico por limitacion tecnica momentanea, debe quedar documentado en el PR o en el doc del modulo con:

- que no se pudo automatizar;
- como se valido manualmente;
- que test debe agregarse despues.

## Documentacion de tests

Cada modulo debe documentar sus tests relevantes en el documento funcional/tecnico correspondiente o en una seccion de este documento si todavia no tiene doc propio.

El objetivo no es repetir el codigo del test, sino dejar claro que comportamiento protege. La documentacion debe permitir que una persona nueva entienda rapidamente:

- que regla se esta validando;
- por que importa;
- que entrada o escenario se usa;
- que resultado se espera;
- donde vive el test automatico.

Formato recomendado:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `nombre del test` | `ruta/al/test` | Regla protegida | Datos o flujo probado | Resultado observable |

Ejemplo:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `rechaza observacion fuera del campo asignado` | `apps/api/src/services/observaciones/*.test.ts` | Alcance por campo del operador | Usuario operador intenta crear observacion sobre lote no asignado | Backend responde error de permisos y no persiste nada |
| `calcula margen bruto de linea` | `apps/web/src/utils/planificacion/*.test.ts` | Formula economica de planificacion | Hectareas, rinde, precio, costo productivo y gastos comerciales conocidos | Margen bruto coincide con el valor esperado |
| `no duplica pendiente offline al reintentar` | `apps/mobile/src/services/*.test.ts` | Idempotencia mobile/offline | Registro con `registroMovilId` se sincroniza dos veces | El backend conserva un solo registro sincronizado |

Cuando se agrega un test por bug corregido, documentar el caso con una descripcion concreta del problema que evita. Ejemplo: "evita que un operador vea observaciones de otro cliente" es mejor que "test de permisos".

Los tests triviales no necesitan documentacion individual. Si un helper tiene muchos casos pequenos, se puede documentar el grupo:

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `formatters` | `apps/web/src/utils/formatters.test.ts` | Formato de fecha, moneda y numeros | Valores validos, vacios y decimales con coma | La UI muestra formatos consistentes sin duplicar logica |

### Catalogo inicial

| Test | Archivo | Valida | Escenario | Resultado esperado |
| --- | --- | --- | --- | --- |
| `admin conserva permisos criticos de configuracion, cierre y auditoria` | `tests/auth-permisos.test.js` | Matriz base de permisos del rol admin | Se consulta el set de permisos de `admin` | Incluye configurar ERP, gestionar usuarios, cerrar planificacion y leer auditoria |
| `operador_campo puede cargar registros operativos pero no configurar planificacion` | `tests/auth-permisos.test.js` | Separacion entre operacion de campo y administracion | Se consultan permisos de `operador_campo` | Puede crear/sincronizar registros operativos y no puede configurar planificacion ni leer auditoria |
| `rol desconocido cae a permisos de operador_campo` | `tests/auth-permisos.test.js` | Fallback seguro de rol | Se pide permisos para un rol inexistente | Devuelve los permisos de `operador_campo` |
| `requierePermiso bloquea a un operador sin permiso administrativo` | `tests/middleware-permisos.test.js` | Middleware de autorizacion backend | Operador intenta usar `planificacion:configurar` | Responde 403 y no ejecuta `next` |
| `requierePermiso permite avanzar a un admin con permiso requerido` | `tests/middleware-permisos.test.js` | Middleware de autorizacion backend | Admin usa `planificacion:configurar` | Ejecuta `next` sin respuesta de error |
| `requiereAlgunPermiso permite avanzar si el rol tiene al menos uno de los permisos` | `tests/middleware-permisos.test.js` | Autorizacion por permisos alternativos | Responsable de compras requiere `auditoria:leer` o `costos:gestionar` | Ejecuta `next` porque tiene `costos:gestionar` |
| `autenticacionBasica rechaza requests sin Bearer token` | `tests/middleware-autenticacion.test.js` | Barrera de autenticacion backend | Request sin header `Authorization` | Responde 401 y no ejecuta `next` |
| `autenticacionBasica rechaza token invalido o expirado` | `tests/middleware-autenticacion.test.js` | Validacion de JWT | Request con token invalido | Responde 401 y no ejecuta `next` |
| `autenticacionBasica carga usuario y permite avanzar con token valido` | `tests/middleware-autenticacion.test.js` | Propagacion de identidad autenticada | Request con JWT valido | Carga `req.user` y ejecuta `next` |
| `manejadorErrores responde 413 controlado cuando el JSON supera el limite` | `tests/middleware-errores.test.js` | Respuesta controlada ante payload grande | Error `entity.too.large` de body parser | Responde 413 con mensaje operativo |
| `manejadorErrores no expone detalle interno para errores sin statusCode` | `tests/middleware-errores.test.js` | Fallback de errores no controlados | Error comun sin `statusCode` | Responde 500 con error generico |
| `manejadorErrores respeta statusCode y mensaje de errores controlados` | `tests/middleware-errores.test.js` | Respuestas de errores de dominio | Error con `statusCode = 403` | Responde 403 con mensaje controlado |
| `obtenerSuperficieInicialLote usa la productiva sin superar la total` | `tests/planificacion-helpers.test.js` | Superficie inicial sugerida para planificacion | Lote con superficie productiva menor o mayor que total | Usa la productiva y nunca supera la total |
| `lineaPlanificacionEstaCompleta exige protocolo, destino, hectareas, rinde y precio positivos` | `tests/planificacion-helpers.test.js` | Criterio de linea completa | Linea completa y variantes con datos faltantes | Solo la linea con todos los campos requeridos queda completa |
| `obtenerClavesDuplicadas detecta duplicados por campania, campo, lote y actividad` | `tests/planificacion-helpers.test.js` | Regla de duplicados de planificacion | Dos lineas comparten lote/actividad en una campania | Devuelve la clave duplicada esperada |
| `calcularResumenPlanificacion suma margen, ingreso, costo y solo hectareas con protocolo` | `tests/planificacion-helpers.test.js` | Totales del resumen de planificacion | Lineas con y sin protocolo | Suma montos y solo cuenta hectareas planificadas con protocolo |
| `calcularGastosComercialesLinea combina items por tonelada y por hectarea` | `tests/planificacion-helpers.test.js` | Calculo de gastos comerciales | Items `Tn` y `Ha` sobre una linea con produccion conocida | Devuelve la suma esperada por tonelada y hectarea |
| `recalcularLineaPlanificacion recalcula ingreso neto, costo y margen con protocolo y gastos` | `tests/planificacion-helpers.test.js` | Formula economica de linea | Linea con rinde, precio, gasto comercial y costo de protocolo | Recalcula ingreso bruto, gasto, neto, costo y margen |
| `calcularCostoLaborProtocolo multiplica cantidad, costo unitario e indice` | `tests/planificacion-helpers.test.js` | Formula de costo de labor en protocolo | Labor con cantidad, costo unitario e indice conocidos | Devuelve costo por hectarea esperado |
| `calcularCostoInsumoProtocolo multiplica dosis, precio e indice` | `tests/planificacion-helpers.test.js` | Formula de costo de insumo en protocolo | Insumo con dosis, precio e indice conocidos | Devuelve costo por hectarea esperado |
| `calcularCostoProtocolo suma labores e insumos de todas las etapas` | `tests/planificacion-helpers.test.js` | Costo total de protocolo | Protocolo con varias etapas, labores e insumos | Devuelve la suma completa de costos por hectarea |
| `validarFechasProtocolo exige dias relativos enteros y siembra en dia cero` | `tests/protocolos-validaciones.test.js` | Reglas de fechas relativas de protocolos | Protocolo relativo con etapa Siembra, dias no enteros o siembra distinta de cero | Lanza error controlado o permite el protocolo valido |
| `validarFechasProtocolo exige fecha objetivo en protocolos absolutos` | `tests/protocolos-validaciones.test.js` | Reglas de fechas absolutas de protocolos | Protocolo absoluto con etapa sin `fechaObjetivo` | Lanza error controlado |
| `validarItemsProtocolo exige estadio e indices de aplicacion entre cero y uno` | `tests/protocolos-validaciones.test.js` | Integridad de etapas, labores e insumos | Etapa sin estadio o items con indice fuera de rango | Lanza error controlado |
| `validarProtocolo exige cabecera minima y delega fechas e items` | `tests/protocolos-validaciones.test.js` | Cabecera y reglas completas de protocolo | Protocolo sin cliente, campania, actividad o etapa invalida | Lanza error controlado |
| `aplicarCostosDesdePadrones actualiza labores e insumos y recalcula costo por hectarea` | `tests/protocolos-validaciones.test.js` | Recalculo de costos desde padrones app | Labor e insumo vinculados a padrones con costos actuales | Actualiza nombres, unidades, precios y costos por ha |
| `aplicarCostosDesdePadrones recalcula costos aun sin padron asociado` | `tests/protocolos-validaciones.test.js` | Fallback de costos manuales de protocolo | Labor sin servicio e insumo sin padron encontrado | Recalcula costo por ha con los datos del item |
| `validarCabeceraPlanificacion exige cliente y campania y bloquea estados finales por guardado comun` | `tests/planificacion-validaciones.test.js` | Guardado de planificacion por endpoint correcto | Planificacion sin cliente/campania o con estado final | Lanza error controlado |
| `validarLineasPlanificacion permite hectareas cero en borrador pero no en cierre` | `tests/planificacion-validaciones.test.js` | Regla de cierre vs borrador | Linea con cero hectareas | Borrador pasa, cierre falla |
| `validarLineasPlanificacion rechaza lote inexistente o hectareas mayores a superficie total` | `tests/planificacion-validaciones.test.js` | Integridad lote/superficie | Linea apunta a lote faltante o excede superficie | Lanza error controlado |
| `validarLineasPlanificacion rechaza valores economicos negativos o no finitos` | `tests/planificacion-validaciones.test.js` | Saneamiento economico antes de persistir | Rinde negativo o precio `NaN` | Lanza error controlado |
| `validarLineasPlanificacion rechaza duplicados por campania, campo, lote y actividad` | `tests/planificacion-validaciones.test.js` | Regla de duplicados del escenario | Dos lineas con misma clave productiva | Lanza error controlado |
| `validarPlanificacionTieneLineasParaCierre exige al menos una linea` | `tests/planificacion-validaciones.test.js` | Cierre de escenario no vacio | Planificacion sin lineas | Lanza error controlado |
| `recalcularLineaPlanificacionPersistida recalcula bruto, neto y margen preservando margen actualizado existente` | `tests/planificacion-validaciones.test.js` | Valores persistidos de linea | Linea con valores base y margen actualizado previo | Recalcula margen planificado y preserva margen actualizado |
| `prepararPrecioReferencia limpia destino y fuerza cliente del usuario autenticado` | `tests/comercial-validaciones.test.js` | Alcance por cliente y normalizacion de precio | Precio con cliente en payload y usuario autenticado con otro cliente | Usa el cliente autenticado y limpia el destino |
| `validarPrecioReferencia exige especie, destino, valor no negativo, moneda y unidad` | `tests/comercial-validaciones.test.js` | Datos minimos de precio de referencia | Precio sin especie, destino, moneda o con valor negativo | Lanza error controlado antes de persistir |
| `prepararDestinoReferencia normaliza nombre, clave y descripcion` | `tests/comercial-validaciones.test.js` | Normalizacion de destinos de venta | Destino con espacios extra y acentos | Genera nombre visible limpio y clave normalizada |
| `validarDestinoReferencia bloquea ERP, puerto y modificaciones de otro cliente` | `tests/comercial-validaciones.test.js` | Proteccion de padrones ERP y alcance por cliente | Destino ERP, puerto ERP o usuario de otro cliente | Lanza error 403 y evita la edicion |
| `prepararGastoComercial limpia cabecera e items y normaliza moneda` | `tests/comercial-validaciones.test.js` | Normalizacion de gastos comerciales | Gasto con textos espaciados, destino e item manual | Limpia cabecera, item, observaciones y moneda |
| `validarGastoComercial exige cabecera completa e items validos` | `tests/comercial-validaciones.test.js` | Datos minimos de gastos comerciales | Gasto sin cliente, empresa, campania, actividad, descripcion o items | Lanza error controlado |
| `validarItemGastoComercial rechaza concepto incompleto, valor negativo, unidad y moneda invalidos` | `tests/comercial-validaciones.test.js` | Integridad de items de gasto comercial | Item sin concepto, con valor negativo, unidad invalida o sin moneda | Lanza error controlado |
| `prepararConceptoGastoComercial genera codigo normalizado desde nombre` | `tests/comercial-validaciones.test.js` | Normalizacion de conceptos comerciales | Concepto sin codigo con nombre acentuado | Genera codigo y nombre normalizado sin acentos |
| `validarConceptoGastoComercial exige cliente, nombre, codigo, unidad y alcance por cliente` | `tests/comercial-validaciones.test.js` | Integridad y permisos de conceptos comerciales | Concepto incompleto o usuario de otro cliente | Lanza error controlado o 403 segun corresponda |
| `normalizarCodigo limpia espacios, acentos y mayusculas` | `tests/padrones-app-validaciones.test.js` | Normalizacion compartida de padrones propios | Codigo con espacios repetidos y acentos | Devuelve clave visible consistente para comparar |
| `prepararZonaApp fuerza empresa global, codigo y estado segun vinculacion ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de zonas propias | Zona manual o vinculada a ERP | Usa empresa global, codigo normalizado y estado correcto |
| `validarZonaAppBasica exige cliente, nombre, estado valido y mismo cliente` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de zonas | Zona incompleta, estado invalido o usuario de otro cliente | Lanza error controlado o 403 |
| `prepararCampoApp normaliza codigo y marca vinculado si tiene campo ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de campos propios | Campo con nombre/codigo espaciado y `campoErpId` | Limpia textos, normaliza codigo y marca `vinculado_erp` |
| `validarCampoAppBasico exige cliente, empresa, nombre y alcance por cliente` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de campos | Campo sin cliente, empresa, nombre o usuario de otro cliente | Lanza error controlado o 403 |
| `obtenerIdZonaDesdeErpId extrae id numerico de claves ERP de zona` | `tests/padrones-app-validaciones.test.js` | Comparacion campo ERP contra zona ERP | Clave ERP valida y clave sin patron esperado | Devuelve id numerico o `undefined` |
| `prepararLoteApp normaliza codigo, superficies numericas y estado ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de lotes propios | Lote con superficies string y `loteErpId` | Convierte superficies, limpia nombre y marca `vinculado_erp` |
| `validarLoteAppBasico exige cliente, campo, nombre y superficies consistentes` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de lotes | Lote sin campo, superficies invalidas o usuario de otro cliente | Lanza error controlado o 403 |
| `prepararEspecieApp fuerza empresa global, codigo y estado segun especie ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de especies propias | Especie con nombre acentuado y `especieErpId` | Usa empresa global, codigo normalizado y estado correcto |
| `validarEspecieAppBasica exige cliente, nombre y alcance por cliente` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de especies | Especie incompleta o usuario de otro cliente | Lanza error controlado o 403 |
| `prepararActividadApp normaliza codigo, omite catalogos vacios y marca vinculacion ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de actividades propias | Actividad con codigo espaciado, catalogos vacios y `actividadErpId` | Limpia nombre/codigo, omite valores vacios y marca `vinculado_erp` |
| `validarActividadAppBasica exige especie y catalogos validos` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de actividades | Actividad sin especie, catalogos invalidos o usuario de otro cliente | Lanza error controlado o 403 |
| `obtenerIdEspecieDesdeErpId extrae id numerico de claves ERP de especie` | `tests/padrones-app-validaciones.test.js` | Comparacion actividad ERP contra especie ERP | Clave ERP valida y clave sin patron esperado | Devuelve id numerico o `undefined` |
| `prepararInsumoApp normaliza codigo, tipo, unidad, moneda y estado ERP` | `tests/padrones-app-validaciones.test.js` | Preparacion de insumos propios | Insumo con nombre acentuado, tipo espaciado y moneda en minuscula | Normaliza codigo, tipo, unidad, moneda y estado |
| `validarInsumoAppBasico exige cliente, empresa, nombre, unidad y precio no negativo` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de insumos | Insumo incompleto, precio negativo o usuario de otro cliente | Lanza error controlado o 403 |
| `prepararServicioApp normaliza codigo, descripcion, unidad, origen y vinculacion` | `tests/padrones-app-validaciones.test.js` | Preparacion de labores propias | Labor sin codigo/unidad explicitos y con `servicioErpId` | Genera codigo, default de unidad, origen ERP y estado vinculado |
| `validarServicioAppBasico exige cliente, codigo, nombre, unidad y costo no negativo` | `tests/padrones-app-validaciones.test.js` | Integridad y alcance de labores | Labor incompleta, costo negativo o usuario de otro cliente | Lanza error controlado o 403 |
| `mapearPadronCampo arma erpId por empresa y normaliza nombre y fecha nula` | `tests/erp-mappers.test.js` | Mapper ERP de campos | Campo ALBOR con espacios y fecha nula | Genera `empresa:x:campo:id`, trimea nombre y usa fecha epoch |
| `mapearPadronLote vincula lote con campo ERP de la misma empresa` | `tests/erp-mappers.test.js` | Mapper ERP de lotes | Lote ALBOR con `idCampo` | Genera lote y `campoErpId` con la misma empresa |
| `mapearAgriculturaCultivo conserva empresa y arma referencias operativas` | `tests/erp-mappers.test.js` | Mapper ERP de cultivos | Cultivo con campo, lote, actividad, especie y campania | Genera referencias normalizadas para cada entidad |
| `mappers globales de actividad, insumo y servicio no duplican por empresa` | `tests/erp-mappers.test.js` | Padrones ERP tratados como globales | Actividad, insumo y servicio recibidos con empresa | Se guardan con `empresaErpId = global` e IDs globales |
| `mapearRespuestaPadronesCampos falla con mensaje ERP cuando succeeded es false` | `tests/erp-mappers.test.js` | Manejo de errores de respuesta ERP | Respuesta fallida de `Padrones/Campos` | Lanza error con mensaje del ERP |
| `validarDatosBasicosRecorrida normaliza titulo, defaults y observaciones` | `tests/operativo-validaciones.test.js` | Validacion pura de recorridas | Recorrida con textos espaciados y objetivo/estado omitidos | Normaliza textos y aplica defaults seguros |
| `validarDatosBasicosRecorrida rechaza objetivo y estado inicial invalidos` | `tests/operativo-validaciones.test.js` | Estados permitidos al crear recorrida | Recorrida con objetivo desconocido o estado `cerrada` | Lanza error controlado antes de persistir |
| `validarCierreRecorrida rechaza recorridas cerradas o canceladas y fecha invalida` | `tests/operativo-validaciones.test.js` | Regla de cierre de recorridas | Cierre sobre estado final o fecha invalida | Bloquea el cierre o devuelve fecha valida |
| `validarDatosBasicosObservacion normaliza textos y exige coordenadas completas` | `tests/operativo-validaciones.test.js` | Validacion pura de observaciones | Observacion con textos espaciados y coordenadas incompletas | Normaliza textos y exige latitud/longitud juntas |
| `validarDatosBasicosObservacion rechaza coordenadas, severidad, origen y fecha invalidos` | `tests/operativo-validaciones.test.js` | Sanitizacion de observaciones operativas | Valores fuera de rango o catalogo | Lanza error controlado antes de consultar DB |
| `validarAdjuntosObservacion normaliza bucket, nombre, mime y estado default` | `tests/operativo-validaciones.test.js` | Metadata segura de adjuntos | Imagen valida sin bucket/estado explicito | Aplica bucket default, MIME normalizado y estado `disponible` |
| `validarAdjuntosObservacion rechaza rutas peligrosas, mime no permitido y checksum invalido` | `tests/operativo-validaciones.test.js` | Seguridad de adjuntos | Path traversal, MIME no imagen o checksum mal formado | Lanza error controlado antes de guardar metadata |
| `validarDatosBasicosPrecipitacion normaliza fecha y observaciones` | `tests/precipitaciones-validaciones.test.js` | Validacion pura de precipitaciones | Lluvia con fecha valida y observaciones espaciadas | Devuelve fecha normalizada y observaciones limpias |
| `validarDatosBasicosPrecipitacion acepta precipitacion sin observaciones` | `tests/precipitaciones-validaciones.test.js` | Carga simple de precipitacion | Lluvia sin observaciones | Devuelve observaciones `null` |
| `validarDatosBasicosPrecipitacion rechaza origen o campo faltante` | `tests/precipitaciones-validaciones.test.js` | Datos minimos de precipitacion | Origen desconocido o campo vacio | Lanza error controlado |
| `validarDatosBasicosPrecipitacion rechaza milimetros no finitos, cero, negativos o extremos` | `tests/precipitaciones-validaciones.test.js` | Rango de lluvia manual | Valores `NaN`, cero, negativos o mayores a 1000 mm | Lanza error controlado |
| `validarDatosBasicosPrecipitacion rechaza fecha invalida` | `tests/precipitaciones-validaciones.test.js` | Fecha de evento de lluvia | Fecha no parseable | Lanza error controlado |
| `esOrigenMapaNdvi y esEstadoMapaNdvi aceptan solo catalogos soportados` | `tests/ndvi-validaciones.test.js` | Catalogos permitidos de mapas NDVI | Origenes y estados validos e invalidos | Solo acepta valores soportados por contrato |
| `validarNumeroOpcional acepta indefinido y rechaza no finitos o fuera de rango` | `tests/ndvi-validaciones.test.js` | Helper numerico compartido de NDVI | Valores indefinidos, `NaN`, menores y mayores al rango | Permite indefinido y lanza error controlado para datos invalidos |
| `validarRangosNdvi protege rangos de nubosidad, NDVI y superficie` | `tests/ndvi-validaciones.test.js` | Rangos de indicadores NDVI | Nubosidad, NDVI, desvio y superficie fuera de rango | Lanza error controlado |
| `prepararMapaNdviParaGuardar recorta proveedor y devuelve fechas parseadas` | `tests/ndvi-validaciones.test.js` | Preparacion previa al guardado NDVI | Mapa con proveedor espaciado y fechas validas | Recorta proveedor y devuelve fechas parseadas |
| `prepararMapaNdviParaGuardar rechaza fechas, proveedor, origen y estado invalidos` | `tests/ndvi-validaciones.test.js` | Validacion de cabecera NDVI | Fecha invalida/futura, proveedor vacio, origen o estado no soportados | Lanza error controlado |
| `procesarSincronizacion deja pendiente un tipo no soportado sin marcarlo como sincronizado` | `tests/offline-sync.test.js` | Sincronizacion offline ante tipos desconocidos | Mobile envia un registro con `tipo = registro-campo` | Queda pendiente con error controlado y no se marca sincronizado |
| `procesarSincronizacion deja pendiente una observacion con payload invalido` | `tests/offline-sync.test.js` | Validacion de payload offline antes de persistir | Mobile envia observacion sin campos obligatorios | Queda pendiente con error controlado y no toca persistencia |

## Casos que siempre requieren tests

No se debe cerrar una feature sin tests cuando toca:

- autenticacion, permisos o roles;
- filtros por `clienteId`, campos asignados o empresas ERP;
- altas, ediciones, cierres, vinculaciones o bajas logicas;
- planificacion, costos, precios, gastos, protocolos o calculos economicos;
- sincronizacion ERP;
- mobile offline, idempotencia o adjuntos;
- migraciones Prisma con reglas de negocio nuevas;
- auditoria;
- endpoints usados por mas de una superficie, por ejemplo web y mobile.

## Reutilizacion antes de duplicar

Antes de crear codigo nuevo, revisar si ya existe una pieza reutilizable:

- contratos en `packages/tipos`;
- cliente HTTP en `apps/web/src/services/api.ts`;
- componentes base como `DataTable`, `Panel`, `PageHeader`, `Button`, `IconButton`, inputs especializados y modales existentes;
- hooks de dominio en `apps/web/src/hooks`;
- helpers en `apps/web/src/utils`;
- servicios backend en `apps/api/src/services`;
- middleware de autenticacion, permisos, validacion y errores;
- funciones de auditoria, formateo, normalizacion y vinculacion sugerida.

Duplicar codigo solo es aceptable como paso transitorio chico y documentado. Si se detecta la segunda copia de una regla o patron, se debe extraer una abstraccion simple.

## Modularizacion esperada

La feature debe respetar esta separacion:

- `packages/tipos`: contratos compartidos entre API, web y mobile.
- `apps/api/src/routes`: endpoints delgados, sin reglas de negocio largas.
- `apps/api/src/services`: reglas de dominio, Prisma, auditoria, integraciones y transacciones.
- `apps/web/src/services`: llamadas HTTP centralizadas.
- `apps/web/src/hooks`: estado, carga, permisos locales y handlers.
- `apps/web/src/components`: piezas visuales reutilizables o componentes especificos del modulo.
- `apps/web/src/utils`: calculos puros, formateo, normalizacion y helpers sin efectos.
- `apps/mobile/src/services` y `apps/mobile/src/store`: API, persistencia local y sincronizacion.

Una screen no deberia acumular formularios, tablas, filtros, calculos, requests y reglas de negocio al mismo tiempo. Si una pantalla supera aproximadamente 350-450 lineas o mezcla responsabilidades claras, debe dividirse.

## Checklist para nueva feature

- [ ] Contratos compartidos definidos o reutilizados.
- [ ] Servicio backend con reglas de negocio fuera de la route.
- [ ] Permisos y alcance validados en backend.
- [ ] Auditoria agregada si modifica datos.
- [ ] Cliente HTTP centralizado.
- [ ] Hook o modulo de estado en frontend cuando hay carga o handlers.
- [ ] Componentes reutilizables o especificos bien separados.
- [ ] Helpers puros extraidos cuando hay calculos o normalizacion.
- [ ] Tests automaticos agregados en las capas de mayor riesgo.
- [ ] Validacion manual documentada solo para lo que no se puede automatizar todavia.
- [ ] `pnpm build` o builds parciales relevantes ejecutados.

## Checklist para feature existente

Al modificar una feature existente:

- [ ] Revisar si hay codigo duplicado que pueda extraerse sin agrandar el cambio innecesariamente.
- [ ] Agregar tests sobre el bug, regla o flujo tocado.
- [ ] No aumentar el tamano de una screen grande si el cambio permite extraer un componente/hook/helper.
- [ ] No crear tipos locales si el contrato cruza API, web o mobile.
- [ ] No crear llamadas `fetch` nuevas fuera del cliente API compartido.
- [ ] Actualizar el documento del modulo si cambia el flujo funcional.

## Estrategia de adopcion sobre lo existente

No hace falta detener el producto para refactorizar todo. La adopcion debe ser incremental:

1. Cada feature nueva nace con tests y modularizacion.
2. Cada cambio sobre un modulo existente mejora un punto concreto de test o reutilizacion.
3. Los modulos de mayor riesgo tienen prioridad: permisos, planificacion, ERP, mobile offline, adjuntos, auditoria y recorridas.
4. Los archivos grandes se achican cuando se los toca por una razon funcional real.

La meta no es refactorizar por estetica. La meta es bajar riesgo, facilitar cambios y evitar que el costo de agregar features crezca cada sprint.
