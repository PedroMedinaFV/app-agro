# Decisiones Tecnicas

## Web separada de mobile

Se crea `apps/web` con React + Vite para validar rapido pantallas y flujos desde navegador. Expo queda enfocado en mobile, donde aporta mas valor para uso de campo y offline-first.

## Web y mobile no son replicas exactas

Web queda orientada a administracion, configuracion, planificacion, analisis, auditoria y trabajo de escritorio.

Mobile queda orientada a operacion diaria de campo: georreferenciacion, recorridas, observaciones, fotos, comentarios y captura rapida sobre lotes asignados.

La informacion generada desde mobile debe poder consultarse y analizarse desde web. Algunas acciones operativas tambien pueden existir en web cuando aporten comodidad, revision o control.

El detalle del acuerdo queda en `docs/ESTRATEGIA_WEB_MOBILE.md`.

## Login demo como desbloqueo

Mientras la base PostgreSQL y Microsoft Entra ID no esten disponibles, usamos un modo demo documentado y aislado. No reemplaza la autenticacion final; permite avanzar en UX, contratos y navegacion.

## Contratos compartidos

Los tipos que cruzan web, mobile y backend viven en `packages/tipos`. Esto reduce divergencias entre clientes y API a medida que crecen las pantallas.

## Snapshot ERP separado del modelo operativo

Los datos importados del ERP se guardan en tablas `Erp*` separadas. Esto evita confundir datos maestros externos con datos operativos propios de Agro App y deja abierta la sincronizacion futura hacia el ERP.

## Secretos por entorno

Las credenciales del ERP se guardan cifradas por cliente en base de datos. Las variables de entorno quedan como fallback de desarrollo y para claves tecnicas globales, como `SECRETS_ENCRYPTION_KEY`.

El backend expone solamente el estado de configuracion, nunca los valores secretos.

## Permisos declarativos

Aunque el MVP solo tenga `admin` y `usuario`, se definen permisos explicitos. Esto evita acoplar las rutas a comparaciones de rol y permite sumar perfiles futuros sin reescribir toda la autorizacion.

## Avance en tres capas

Cada funcionalidad nueva debe dejar una huella en las tres capas del producto:

- Backend: contrato, endpoint, persistencia o servicio necesario.
- Web: pantalla o estado visible para validar desde navegador.
- Mobile: experiencia equivalente, aunque inicialmente sea una version demo o de lectura.

Si una capa queda diferida, debe quedar documentada como pendiente explicito.

## Screens y componentes web

En web, una `Screen` representa una vista completa de negocio conectada a la navegacion principal o a un flujo de pantalla completa. Una `Screen` puede orquestar datos, permisos y acciones de una funcionalidad concreta.

Un `Component` representa una pieza reutilizable o transversal, por ejemplo layout, tabla, toast, spinner, modal o controles compartidos.

Regla de mantenimiento:

- `App.tsx` debe quedar como composicion de layout, hooks y rutas/vistas principales.
- Cada funcionalidad nueva debe vivir en una screen propia.
- Si una screen crece por contener subflujos claros, se divide en sub-screens o componentes especificos.
- Las tablas deben usar `DataTable` salvo que haya una necesidad puntual de grilla editable.

## Bloqueo global de acciones backend

Toda llamada de la web al backend debe mostrar un bloqueo global de pantalla con spinner centrado hasta recibir respuesta.

El bloqueo se activa desde el cliente HTTP compartido de la web, no desde cada boton individual. Esto asegura consistencia entre pantallas, evita dobles envios accidentales y mejora la percepcion de estado cuando una accion impacta datos persistidos.

Los spinners locales pueden mantenerse como refuerzo visual puntual, pero la garantia transversal es el overlay bloqueante.

## Sincronizacion ERP por empresa

Los padrones operativos del ERP requieren `x-company`. Por eso no se consulta una unica vez de forma global: se consulta por cada empresa ERP asociada al cliente.

Los IDs internos importados incluyen la empresa, por ejemplo `empresa:1:campo:241`. Esto evita colisiones cuando distintas empresas devuelven el mismo identificador numerico y permite auditar la procedencia con `empresaErpId`.

La sincronizacion se administra desde una pantalla propia, separada de `Empresas ERP`. La pantalla permite seleccionar todos los padrones o solo algunos. El backend agrega dependencias tecnicas cuando corresponda para mantener relaciones consistentes, por ejemplo lotes requiere campos, campos requiere zonas, cultivos requiere lotes/campos/campanias/actividades/especies, e insumos o servicios requieren unidades de medida.

La pantalla `Empresas ERP` queda enfocada en elegir que empresas pertenecen a AGRO. La pantalla `Sincronizacion ERP` queda enfocada en importar o refrescar informacion desde ALBOR.

## Seguridad como requisito transversal

La seguridad no se trata como mejora posterior. Toda funcionalidad administrativa debe validar autenticacion, permisos, no exponer secretos y dejar preparada la trazabilidad de cambios sensibles.

## Supabase como base remota de pruebas

Se usara Supabase PostgreSQL para comenzar pruebas reales de persistencia sin depender de PostgreSQL local ni Docker.

Prisma sigue siendo la capa de acceso a datos del backend. Web y mobile no deben conectarse directo a Supabase para datos sensibles; consumen la API propia.

La conexion se configura en `.env` mediante `DATABASE_URL`, usando la cadena `Session pooler` del boton `Connect` de Supabase. Las migraciones existentes se aplican con `pnpm --filter agro-app-api db:deploy`.

La guia operativa queda documentada en `docs/SUPABASE.md`.

## Auditoria obligatoria

Toda edicion de datos realizada por un usuario debe generar un registro de auditoria desde backend.

La auditoria debe indicar quien hizo el cambio, cuando, sobre que entidad, que accion ejecuto y que valores cambiaron cuando corresponda. No se deben guardar secretos completos en los valores auditados.

Esta decision aplica a administracion, planificacion agricola, protocolos, asignaciones, configuracion ERP y futuras cargas operativas.

## Alcance de usuario por campos

El usuario comun no se asigna a una empresa ERP completa. Se le asignan campos ERP especificos.

La empresa queda asociada de forma implicita porque cada campo importado guarda `empresaErpId`. Esto permite:

- dar acceso granular por campo;
- evitar que un usuario vea toda una empresa por error;
- soportar usuarios que trabajan campos de mas de una empresa AGRO;
- conservar trazabilidad para sincronizacion con `x-company`.

El backend es responsable de aplicar este filtro antes de responder datos operativos.

## Protocolos como plantillas

Los protocolos productivos se modelan como plantillas reutilizables con descripcion, etapas, labores e insumos.

Cuando un protocolo se asigna a una fila de planificacion, se copia a una version editable dentro de esa planificacion. Esto evita que cambios posteriores en el protocolo base alteren planificaciones ya revisadas o aprobadas.

Los insumos deberan venir idealmente del ERP mediante un padron especifico pendiente de integrar.

## Precios de referencia y supuestos congelados

Agro App tendra una entidad transversal de precios de referencia por actividad/cultivo y destino de venta. No pertenece exclusivamente a planificacion.

La planificacion agricola consumira esa entidad para proponer precios.

Al crear una linea de planificacion, el sistema propone un precio desde esa tabla, pero copia el valor a la linea para conservar el supuesto original. El usuario puede modificar el precio manualmente.

Los cambios posteriores en la tabla de precios no deben reescribir planificaciones aprobadas. Sirven para calcular margen bruto actualizado y comparar contra el margen bruto planificado.

## Gastos comerciales de referencia

Agro App tendra una entidad de gastos comerciales de referencia para modelar flete, acondicionamiento, comisiones y otros gastos de venta.

La planificacion agricola consumira esa entidad para proponer gastos segun campania, actividad, destino y alcance. Al crear una linea se copia el resultado calculado para conservar el supuesto original.

Los gastos comerciales pertenecen a una campania agricola porque los costos comerciales pueden cambiar entre campanias. Pueden aplicar a todas las zonas, a una zona especifica o a un campo especifico; campo tiene prioridad sobre zona. Para el MVP, cada item se carga como valor por tonelada. Se evita exponer tipos de calculo y unidad hasta que exista una necesidad operativa concreta.

Los conceptos de gastos comerciales se administran como maestro propio por cliente. En la carga normal se seleccionan desde un listado, no como texto libre, para evitar variantes de escritura y facilitar reportes consistentes.

La administracion web se realiza desde una tabla con alta/edicion en modal. Toda alta o modificacion debe persistirse desde backend y auditarse.

## Destino de venta sugerido

La planificacion agricola usara una tabla de destinos sugeridos por zona/campo/actividad/cultivo.

Al crear una linea de planificacion, el sistema propone un destino de venta segun la coincidencia mas especifica disponible. Ese destino se copia a la linea y el usuario puede modificarlo manualmente.

Los cambios posteriores en la tabla de destinos sugeridos no deben modificar planificaciones aprobadas sin accion explicita.

Esta decision se toma por experiencia de usuario: evita cargar el destino cereal por cereal o lote por lote cuando existe una regla repetible, reduciendo fatiga y errores de carga.

## Padrones base provisorios

La planificacion agricola no debe depender de que todos los padrones base existan previamente en el ERP.

Agro App permitira crear zonas, campos, lotes, especies, actividades e insumos provisorios para planificar o armar protocolos. Cuando el ERP devuelva esos registros, se podran vincular con auditoria.

Esta decision evita frenar la planificacion por demoras administrativas o de carga en el ERP.

La regla no aplica a datos operativos importados desde endpoints como `Agricultura/Cultivos`.

El snapshot operativo de planificacion debe priorizar datos reales. Si existen padrones ERP sincronizados, el backend los materializa como registros propios vinculados en las tablas de planificacion antes de responder. Asi la web no trabaja con mocks ni con IDs virtuales: trabaja con `CampoPlanificacion`, `LotePlanificacion`, `ActividadPlanificacion`, `EspeciePlanificacion`, `InsumoPlanificacion`, `LaborReferencia` y `ZonaPlanificacion` persistidos, aptos para relaciones, validaciones y auditoria. El mock queda reservado para desarrollo cuando no hay base/cache disponible.

En lotes provisorios, la web permite copiar un lote propio existente para acelerar altas repetitivas. La copia conserva campo y superficies, pero se guarda como un registro nuevo con estado `provisorio` y sin `loteErpId`; la vinculacion ERP sigue siendo una accion posterior, propuesta y auditada.

La vinculacion manual de lotes se permite desde el padron web solamente sobre lotes propios en estado `provisorio`. El usuario selecciona el lote provisorio y confirma contra que lote ERP disponible debe quedar enlazado. El backend valida que el lote ERP exista, que no este usado por otro lote del mismo cliente y que pertenezca al mismo campo ERP cuando el campo propio ya este vinculado. La accion se registra en auditoria. Una vez vinculado, el lote propio deja de mostrarse como fila independiente y queda visible el lote ERP como referencia principal.

La vinculacion manual de padrones provisorios sigue el mismo criterio para zonas, campos, lotes, especies, actividades, insumos y labores: solo nace desde un registro propio de Agro App en estado `provisorio` y se confirma contra un registro ERP disponible. El backend valida que la referencia ERP exista, que no este usada por otro registro del mismo cliente y que respete las relaciones necesarias, por ejemplo campo-zona, lote-campo o actividad-especie. Una vez vinculado, el registro propio deja de mostrarse como fila independiente y queda visible el registro ERP como referencia operativa.

La web ordena los candidatos de vinculacion con una sugerencia simple por codigo y nombre normalizados. Esta sugerencia solo mejora la busqueda del usuario: no vincula automaticamente, no reemplaza la confirmacion manual y no modifica las validaciones de backend.

Las vinculaciones confirmadas no son irreversibles. La web debe ofrecer un listado transversal de vinculaciones para revisar, editar o desvincular relaciones ERP de zonas, campos, lotes, especies, actividades, insumos y labores. Toda correccion debe pasar por backend, respetar las mismas validaciones de integridad y registrar auditoria con motivo.

La edicion de una vinculacion debe usar el mismo criterio asistido que la vinculacion inicial: candidatos ERP disponibles, filtros de compatibilidad por relacion cuando correspondan y ordenamiento por coincidencia de codigo/nombre. El registro ERP actualmente vinculado sigue disponible para no forzar cambios innecesarios, pero los ERP usados por otros registros del mismo cliente quedan excluidos.

Luego de una sincronizacion ERP, el backend genera sugerencias persistidas de vinculacion para padrones provisorios cuando encuentra coincidencias fuertes o medias. Cada sugerencia crea una notificacion interna pendiente para usuarios con permisos de configuracion. La vinculacion sigue siendo manual: la notificacion informa, pero no modifica registros ni reemplaza la auditoria de confirmacion.

La web tambien permite regenerar sugerencias manualmente desde la pantalla de notificaciones usando la cache ERP existente. Esto evita tener que volver a sincronizar ALBOR cuando solo se necesita recalcular coincidencias sobre datos ya importados.

Las sugerencias se resuelven desde `Notificaciones` con dos acciones:

- `Aceptar`: el backend aplica la vinculacion sobre el padron propio correspondiente, reutilizando las validaciones de cada entidad para evitar vinculos duplicados o incompatibles.
- `Descartar`: la sugerencia queda cerrada sin modificar el padron propio.

En ambos casos se actualiza el estado de `VinculacionErpSugerida` y `NotificacionUsuario`, y se registra auditoria con usuario, decision y valores principales. La vinculacion nunca se aplica solo desde frontend; la decision visual dispara una accion de backend que vuelve a validar permisos, cliente y consistencia.

## Escenarios de planificacion

Una campania puede tener varias planificaciones abiertas para simular distintos escenarios. Al cerrar una, esa planificacion queda como escenario final elegido y se marca `escenarioOriginal = true`. Las demas planificaciones del mismo cliente y campania quedan `deshabilitada`, con `escenarioBloqueadoPorId` apuntando al escenario cerrado.

La palabra "original" se usa como bandera de escenario elegido para la campania, no como "primer registro creado". La regla vive en backend y se ejecuta en transaccion junto con auditoria para evitar dos escenarios originales activos de la misma campania.

La carga inicial de un escenario parte de todos los lotes activos disponibles y propone la superficie productiva como superficie planificada. En la grilla, el protocolo funciona como selector principal del planteo productivo: al elegir protocolo se define la actividad de la linea. La copia de linea existe para casos de doble cultivo sobre el mismo lote, y la copia de escenario existe para simular alternativas sin recargar toda la planilla.

Crear o copiar un escenario debe persistir inmediatamente un borrador real en backend. La UI no debe mostrar como creado un escenario que no pudo guardarse en la base, porque eso genera una falsa sensacion de seguridad y rompe la auditoria. El boton `Guardar borrador` queda para modificaciones posteriores dentro del editor.

## Administracion de padrones maestros

Los padrones maestros propios de Agro App deben tener pantallas administrativas en web cuando el usuario tenga permisos suficientes.

Esto incluye, como minimo:

- zonas de planificacion;
- campos de planificacion;
- lotes de planificacion;
- especies de planificacion;
- actividades de planificacion;
- insumos de planificacion;
- destinos de venta;
- conceptos de gastos comerciales;
- labores de referencia;
- estadios fenologicos de referencia cuando se administren localmente.

Cada pantalla debe permitir listar, crear, editar, activar/desactivar y vincular contra ERP cuando corresponda. Las altas y modificaciones deben persistirse desde backend, validar `clienteId`, aplicar permisos declarativos y registrar auditoria.

Las pantallas no deben reemplazar la sincronizacion ERP: son herramientas para administrar datos propios, datos provisorios y reglas internas que permiten operar aunque el ERP todavia no tenga todo cargado.

## Vinculacion de labores con ERP

Las labores propias de Agro App se sincronizaran con servicios del ERP desde `Padrones/Servicios`.

Proceso acordado:

- Si una labor todavia no existe en el ERP, un usuario autorizado puede crearla en Agro App como provisoria.
- La labor provisoria puede usarse inmediatamente en protocolos.
- Cuando la sincronizacion ERP trae un servicio compatible, el sistema no debe reemplazar la labor en silencio.
- El sistema debe generar una sugerencia de vinculacion y una notificacion para usuarios autorizados.
- La sugerencia debe mostrar labor Agro App, servicio ERP, empresa ERP, codigo, descripcion, unidad, precio y nivel de confianza.
- La vinculacion se confirma o rechaza manualmente.
- Al confirmar, se guarda `servicioErpId` y metadatos ERP en la labor, se cambia el estado a `vinculado_erp` y se audita el cambio.
- Al rechazar, la sugerencia queda cerrada y la labor sigue como provisoria.
- Protocolos y planificaciones ya cerradas conservan los valores copiados originalmente.

Criterios de sugerencia:

- coincidencia fuerte: mismo codigo normalizado dentro de la empresa ERP;
- coincidencia media: descripcion normalizada muy similar y unidad compatible;
- coincidencia baja: descripcion parcial o tipo de servicio compatible, requiere revision cuidadosa.

Para el MVP no se hara auto-vinculacion. La confirmacion manual reduce errores y mantiene trazabilidad.

Primer padron implementado:

- conceptos de gastos comerciales;
- pantalla web `Padrones`;
- alta/edicion en modal;
- baja logica mediante campo `activo`;
- persistencia backend en `/conceptos-gastos-comerciales/:id`;
- auditoria obligatoria por backend.

Segundo padron implementado:

- destinos de venta;
- pantalla web `Padrones > Destinos`;
- alta/edicion en modal;
- baja logica mediante campo `activo`;
- persistencia backend en `/destinos-venta/:id`;
- auditoria obligatoria por backend.

Las reglas para sugerir destino por zona, campo, actividad o cultivo se implementaran como una capa posterior que referencie el destino maestro, sin duplicar nombres de destino.

El padron maestro de destinos no expone prioridad. Si mas adelante se necesita resolver empates o reglas multiples, ese orden pertenecera a la regla de sugerencia y no al destino.

Tercer padron implementado:

- labores de referencia;
- pantalla web `Padrones > Labores`;
- alta/edicion en modal;
- baja logica mediante campo `activo`;
- estados `provisorio`, `vinculado_erp` y `archivado`;
- origen `provisorio`, `semilla` o `erp`;
- persistencia backend en `/labores-referencia/:id`;
- auditoria obligatoria por backend;
- mapper ERP preparado para `Padrones/Servicios`.
