# Testing mobile

Guia practica para probar `apps/mobile` durante desarrollo.

## 1. Comandos base

Desde la raiz del repo:

```bash
pnpm --filter agro-app-api dev
pnpm --filter agro-app-mobile dev
```

Para validar que compila:

```bash
pnpm --filter agro-app-mobile build
```

El build usa `expo export`. Sirve como control tecnico, pero no reemplaza una prueba en dispositivo.

## 2. URL de API

Mobile consume la API desde:

```ts
process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
```

La variable está en `.env` / `.env.example`:

```env
EXPO_PUBLIC_API_URL="http://localhost:4000"
```

### Importante

`localhost` cambia segun donde corre la app:

- En navegador web de la PC: `localhost` es tu PC.
- En emulador/dispositivo mobile: `localhost` es el emulador o el celular, no tu PC.
- En Expo Go desde un celular real, hay que usar la IP local de la PC.

Ejemplo:

```env
EXPO_PUBLIC_API_URL="http://192.168.1.50:4000"
```

La PC y el celular deben estar en la misma red.

## 3. Como obtener la IP local de la PC

En PowerShell:

```powershell
ipconfig
```

Buscar la IP de la placa conectada a la red, por ejemplo:

```text
Dirección IPv4 . . . . . . . . . . . . . : 192.168.1.50
```

Usar esa IP en `EXPO_PUBLIC_API_URL`.

## 4. Probar en navegador

Sirve para validar pantallas y flujo general sin usar un dispositivo.

1. Dejar la API corriendo:

   ```bash
   pnpm --filter agro-app-api dev
   ```

2. Dejar mobile corriendo:

   ```bash
   pnpm --filter agro-app-mobile dev
   ```

3. Abrir la URL web que muestra Expo.

4. En este modo puede funcionar:

   ```env
   EXPO_PUBLIC_API_URL="http://localhost:4000"
   ```

Limitaciones:

- No representa 100% Android/iOS.
- Camara, archivos, permisos y comportamiento offline pueden diferir.

## 5. Probar con Expo Go en celular real

Esta es la prueba mas cercana al uso real sin generar una app instalable.

1. Instalar Expo Go en el celular.
2. Confirmar que PC y celular esten en la misma red Wi-Fi.
3. Configurar `.env` con la IP de la PC:

   ```env
   EXPO_PUBLIC_API_URL="http://192.168.1.50:4000"
   ```

4. Reiniciar Expo despues de cambiar `.env`:

   ```bash
   pnpm --filter agro-app-mobile dev
   ```

5. Escanear el QR con Expo Go.
6. Probar login, carga de datos y funcionalidades operativas.

Si no conecta:

- verificar que la API siga corriendo;
- abrir desde el navegador del celular `http://192.168.1.50:4000`;
- revisar firewall de Windows;
- revisar que no se haya usado `localhost` en la variable;
- reiniciar Expo para que tome el cambio de `.env`.

## 6. Probar en emulador Android

Si se usa Android Emulator, normalmente la IP especial para acceder al host es:

```env
EXPO_PUBLIC_API_URL="http://10.0.2.2:4000"
```

Esto depende del emulador. En Expo Go con celular real, usar la IP LAN de la PC.

## 7. Flujos mobile a validar

### Login y permisos

- [ ] Login demo funciona.
- [ ] Login real con token funciona cuando este configurado.
- [ ] El usuario ve solo campos/lotes asignados.
- [ ] El rol operador no accede a funciones administrativas.

### Datos operativos

- [ ] Carga `GET /planificacion/snapshot`.
- [ ] Muestra campos asignados.
- [ ] Muestra lotes asignados.
- [ ] Al seleccionar lote, carga `GET /operativo/lotes/:id/ficha`.
- [ ] La ficha muestra superficies, zona, cultivos ERP, planificacion, lluvias y observaciones.
- [ ] La ficha muestra geografia si el lote tiene KML/KMZ procesado.

### Precipitaciones

- [ ] Se puede cargar precipitacion con sesion real.
- [ ] Si falla la conexion, queda como pendiente local.
- [ ] Al recuperar conexion, se sincroniza sin duplicar.
- [ ] La precipitacion cargada aparece en web.

### Observaciones

- [ ] Se puede cargar observacion con titulo, descripcion y severidad.
- [ ] Se puede adjuntar/tomar foto.
- [ ] La foto se copia al sandbox local antes de quedar pendiente.
- [ ] Con sesion real, la observacion se envia al backend.
- [ ] Si falla la conexion, queda pendiente.
- [ ] Al recuperar conexion, se sincroniza sin duplicar.
- [ ] La observacion cargada aparece en web.

### Offline

- [ ] Cortar conexion y crear precipitacion.
- [ ] Cortar conexion y crear observacion con foto.
- [ ] Ver pendientes locales.
- [ ] Restaurar conexion.
- [ ] Sincronizar pendientes.
- [ ] Confirmar que no se duplican registros al reintentar.

## 8. Problemas comunes

### La app abre pero no carga datos

Revisar `EXPO_PUBLIC_API_URL`. En celular real no usar `localhost`.

### Cambie `.env` y sigue igual

Reiniciar Expo. Las variables `EXPO_PUBLIC_*` se inyectan al iniciar el bundler.

### La API funciona en PC pero no en celular

Posibles causas:

- firewall bloqueando puerto `4000`;
- PC y celular en redes distintas;
- IP incorrecta;
- API escuchando solo en `localhost`.

La API del proyecto escucha en `0.0.0.0:4000`, por lo que deberia aceptar conexiones LAN si el firewall lo permite.

### Fotos no suben

Revisar:

- bucket de Supabase Storage;
- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- permisos del celular para camara/galeria;
- conexion al momento de sincronizar.

## 9. Criterio minimo antes de cerrar un cambio mobile

- [ ] `pnpm --filter agro-app-mobile build` pasa.
- [ ] Se probo al menos en Expo web o Expo Go.
- [ ] Si el cambio toca camara, archivos u offline, se probo en celular real.
- [ ] Si el cambio toca API, se probo con `EXPO_PUBLIC_API_URL` apuntando a la API local real.
- [ ] Se verifico en web que el dato cargado desde mobile aparece correctamente.
