# Decisiones Tecnicas

## Web separada de mobile

Se crea `apps/web` con React + Vite para validar rapido pantallas y flujos desde navegador. Expo queda enfocado en mobile, donde aporta mas valor para uso de campo y offline-first.

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

## Sincronizacion ERP por empresa

Los padrones operativos del ERP requieren `x-company`. Por eso no se consulta una unica vez de forma global: se consulta por cada empresa ERP asociada al cliente.

Los IDs internos importados incluyen la empresa, por ejemplo `empresa:1:campo:241`. Esto evita colisiones cuando distintas empresas devuelven el mismo identificador numerico y permite auditar la procedencia con `empresaErpId`.

## Seguridad como requisito transversal

La seguridad no se trata como mejora posterior. Toda funcionalidad administrativa debe validar autenticacion, permisos, no exponer secretos y dejar preparada la trazabilidad de cambios sensibles.

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

La planificacion agricola usara una tabla de precios de referencia por actividad/cultivo y destino de venta.

Al crear una linea de planificacion, el sistema propone un precio desde esa tabla, pero copia el valor a la linea para conservar el supuesto original. El usuario puede modificar el precio manualmente.

Los cambios posteriores en la tabla de precios no deben reescribir planificaciones aprobadas. Sirven para calcular margen bruto actualizado y comparar contra el margen bruto planificado.

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
