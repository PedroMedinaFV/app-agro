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
