# Testing mobile

Guia practica para probar `apps/mobile` durante desarrollo.

La arquitectura, persistencia y limites del flujo actual estan en [OFFLINE.md](OFFLINE.md). Las pruebas automaticas de etapa 3 no sustituyen el recorrido en celular indicado aqui; ese recorrido permanece pendiente.

Actualizado: 2026-11-06. Para comenzar sin experiencia previa, seguir las secciones 0, 3 y 5, en ese orden. Los ejemplos usan Windows/PowerShell y un telefono fisico. Son instrucciones revisadas contra el codigo y la documentacion de Expo; todavia no se ejecutaron en un telefono de este proyecto.

## 0. Que necesito instalar

En la PC se usa el proyecto que ya tenes: Node/pnpm y sus dependencias. Para la primera prueba con Expo Go no necesitas una extension de VS Code, Android Studio, emulador ni cable USB. El telefono y la PC deben poder comunicarse por la misma Wi-Fi.

Expo Go es la aplicacion que abre Agro App durante desarrollo. **Este proyecto usa Expo SDK 57** (`apps/mobile/package.json`); Expo Go debe soportar ese SDK. Instalar cualquier version de la tienda no garantiza compatibilidad.

| Telefono | Preparacion |
| --- | --- |
| Android | Abrir desde el telefono la [descarga oficial de Expo Go para SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=true). Seguir la instalacion manual del APK enlazado por Expo. Si Android solicita permitir instalacion desde el navegador, habilitarla para esa instalacion y luego revocarla. No necesitas Expo Orbit para la opcion manual. |
| iPhone/iPad | Para SDK 57, la version de Expo Go de App Store no alcanza. La [guia oficial de compatibilidad](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) indica `eas go` y distribucion mediante TestFlight con membresia Apple Developer; otra opcion es preparar un development build. No es el mismo procedimiento simple de Android. |

Si usas iPhone, hace falta preparar esa distribucion antes de continuar con el QR. Para compilar iOS localmente se necesita macOS/Xcode; desde Windows puede prepararse una compilacion en la nube con su configuracion y firma. Las opciones estan en la [guia de development builds](https://docs.expo.dev/develop/development-builds/introduction/). Este repo no tiene aun `expo-dev-client`, perfil EAS ni distribucion iOS preparados: estos pasos no los generan ni contratan servicios.

Si ya dispones de Expo Go compatible en iPhone, Expo requiere la misma cuenta Expo en telefono y CLI. Usar `pnpm --filter agro-app-mobile exec expo login` antes de iniciar el servidor. Esa cuenta es distinta de los usuarios A/B de Agro App. Ver [inicio en dispositivo](https://docs.expo.dev/get-started/start-developing/).

Para probar los registros hacen falta, ademas:

- API y PostgreSQL disponibles, con migraciones aplicadas.
- Usuario A de Agro App con rol operador, cliente asociado y al menos un campo/lote asignado. Preparar un usuario B para el cambio de cuenta; preferir cuentas y datos exclusivos de testing.
- Email/password de esas cuentas. El boton Microsoft de mobile todavia no inicia sesion; usar el login por email existente. No existe un login demo en el flujo activo.
- Para enviar y abrir fotos: Supabase Storage configurado en la API. Para tomar/guardar la foto localmente se necesitan permisos de camara/galeria. Si Storage no esta configurado, se puede verificar guardado local, pero no dar por aprobada la subida.

El recorrido guarda datos reales en la base que use la API. A diferencia de `pnpm test:integration`, no crea un schema temporal ni elimina automaticamente los registros. Verificar ambiente y cuentas antes de cargar pruebas.

## 1. Comandos base

Desde la raiz del repo:

```bash
pnpm --filter agro-app-api dev
pnpm --filter agro-app-mobile exec expo start --go --lan --port 8082
```

Ejecutar cada comando en su propia terminal. `pnpm --filter agro-app-mobile dev` es el launcher de **web**: agrega `--web` y busca un puerto libre. Para esta prueba nativa usar el comando explicito de arriba. Configurar la URL accesible de API antes de arrancar Expo, como indica la seccion 5.

Para validar que compila:

```bash
pnpm --filter agro-app-mobile build
```

El build usa `expo export`. Sirve como control tecnico, pero no reemplaza una prueba en dispositivo.

`pnpm test` incluye compilacion y pruebas del nucleo offline; `pnpm --filter agro-app-mobile exec tsc --noEmit` verifica tipos de toda la app.

## 2. URL de API

Mobile consume la API desde:

```ts
process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'
```

El `.env.example` raiz documenta la variable; el launcher mobile no carga ese archivo. Exportarla en la terminal que inicia Expo o usar un `.env` de `apps/mobile`:

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

### 5.1. Preparar las terminales y comprobar la conexion

Conectar PC y telefono a la misma Wi-Fi, sin red de invitados que aisle equipos. Mantener la PC encendida durante la prueba. Obtener su IPv4 con `ipconfig` (seccion 3); **reemplazar `192.168.1.50` en todos los ejemplos por esa IPv4**. Si cambia la red/IP, actualizar la URL y reiniciar Expo.

Abrir dos terminales PowerShell en VS Code, ambas ubicadas en la raiz `agro-app`. No pegar todos los servidores en una sola terminal: cada uno queda ejecutandose y ocupa esa terminal.

**Terminal 1: API.** El `.env` raiz debe tener la configuracion de desarrollo ya operativa:

```powershell
pnpm --filter agro-app-api dev
```

Esperar el mensaje de API en puerto 4000. En el **navegador del telefono**, abrir:

```text
http://192.168.1.50:4000/home
```

Resultado esperado: `{"estado":"ok"}`. No hace falta iniciar sesion para esta URL. Si no responde, resolver la conexion antes de abrir Agro App: el QR no corrige el acceso a la API. Este endpoint confirma HTTP; login y consulta de campo comprobaran acceso a base.

**Terminal 2: Expo nativo.** Exportar la URL de API y luego iniciar Expo en esa misma terminal:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.50:4000"
pnpm --filter agro-app-mobile exec expo start --go --lan --port 8082
```

La variable solo aplica a esa terminal y sus procesos. Repetirla si se abre otra terminal. Como alternativa persistente, editar/crear `apps/mobile/.env` y agregar esa unica variable sin reemplazar otras configuraciones; el `.env` raiz no es cargado por el launcher mobile. No poner secretos en variables `EXPO_PUBLIC_*`.

Expo debe mostrar un QR y una direccion LAN, normalmente `exp://192.168.1.50:8082`. En Android abrir Expo Go y usar su lector de QR; en iPhone compatible usar la camara para abrir el enlace. Aceptar permisos de red local si el sistema los pide. Ver [instrucciones oficiales de arranque](https://docs.expo.dev/get-started/start-developing/).

La primera carga puede tardar mientras la PC genera el bundle. Si hay un error, conservar el texto de la terminal y del telefono. `--go` elige Expo Go; `--lan` permite llegar desde la red local; 8082 sirve el codigo y 4000 sirve la API. Si 8082 esta ocupado, detener solamente la instancia propia anterior de Expo o elegir otro puerto y usar el QR nuevo.

En Windows, permitir Node.js en el aviso de firewall para la red privada de confianza. Si las reglas de PC/red son administradas, solicitar acceso LAN a los puertos de API/Expo; no desactivar todo el firewall. Evitar Wi-Fi de invitados y VPN que impidan trafico entre equipos.

### 5.2. Primera prueba con conexion

1. Ingresar en Agro App con email/password del usuario A.
2. Comprobar que aparecen su campo y lote; usar **Cambiar campo**/**Cambiar lote** si hace falta. Si no hay campos asignados, configurarlos desde administracion web antes de continuar.
3. Anotar el contador **Pendientes de sincronizacion**. Si ya hay pendientes, conservarlos y registrar su cantidad inicial `N`; no borrar almacenamiento para empezar en cero.
4. Opcionalmente abrir una tercera terminal con `pnpm --filter agro-app-web dev` para verificar despues los registros desde web en la PC. Web y mobile deben apuntar a la misma API/ambiente.

### 5.3. Guardar sin acceso a la API: primera prueba offline

La forma mas sencilla y repetible de empezar es **detener solo la API**. Dejar Wi-Fi, Expo y la pantalla del telefono abiertos: la app conserva acceso al servidor que entrega el codigo, pero no puede enviar registros al backend.

1. En la **terminal 1 de la API**, presionar `Ctrl+C`. No detener terminal 2 de Expo. Esperar que el proceso termine; `/home` ya no debe responder en el telefono.
2. Sin cerrar sesion ni recargar la app, ir a precipitaciones: escribir `25` en **Milimetros** y `PRUEBA-OFFLINE-<fecha-hora>` en **Observaciones**. Tocar **Guardar precipitacion** y esperar el resultado del intento de envio.
3. El formulario debe limpiarse despues del guardado local y el contador pasar de `N` a `N+1`. El aviso de fallo de envio es esperado: no significa que se perdio el registro.
4. Crear una observacion con **Titulo** `PRUEBA-OFFLINE-<fecha-hora>` y una descripcion identificable. Tocar **Tomar foto** (o **Elegir foto**), permitir camara/galeria, confirmar la foto y tocar **Guardar observacion**.
5. Debe conservarse el segundo registro y su foto localmente aunque falle el envio. El contador esperado es `N+2`. Si informa fallo de guardado local y el formulario permanece, registrar el error: no dar ese registro por guardado.
6. Anotar titulo, campo/lote, hora y contador; conservar captura si ayuda. No tocar **Sincronizar pendientes** repetidamente durante esta primera pasada.

Esta variante comprueba indisponibilidad de API. Para probar corte de red real, repetir luego con la app ya cargada y Wi-Fi/datos moviles desactivados (o modo avion, verificando que no quede Wi-Fi habilitado). Puede tardar en fallar una solicitud por los tiempos del sistema. Restaurar red antes de reabrir Expo o autenticar: el proyecto no implementa login ni arranque completo offline. El flag CLI `--offline` no simula perdida de conexion de la aplicacion; no se usa para este recorrido.

### 5.4. Cambio de usuario y reinicio sin perder pendientes

1. Volver a iniciar API en terminal 1 con `pnpm --filter agro-app-api dev`; comprobar `/home`. Si se habia cortado la red, restaurarla.
2. En el telefono tocar **Cerrar sesion** e ingresar como B. No guardar nuevos registros ni sincronizar como A todavia.
3. B debe ver sus propios campos autorizados y pendientes; no deben aparecer formularios, fotos ni cargas pendientes de A. Si ambos tienen un campo compartido, su nombre puede aparecer legitimamente en ambos. La cola de A no puede atribuirse a B.
4. Salir de B, ingresar como A y verificar el contador `N+2`. El login por si solo no sincroniza la cola.
5. Cerrar por completo Expo Go desde las aplicaciones recientes; no desinstalar, borrar datos ni quitar el proyecto. Dejar API/Expo de la PC ejecutandose.
6. Abrir Expo Go y el proyecto otra vez (o escanear el mismo QR), autenticar como A con conexion y comprobar otra vez los pendientes. La sesion y el snapshot remoto no se guardan para un arranque sin red; que pida login es esperado.

### 5.5. Enviar y comprobar el resultado

1. Como A, con API/red disponibles, tocar **Sincronizar pendientes** y esperar. Guardar un registro tambien intenta sincronizar la cola; para esta prueba usar el boton explicito.
2. Con todos los pendientes validos y servicios configurados, el contador debe quedar en cero. Si habia pendientes anteriores con errores, revisar su resultado; no concluir que los dos nuevos fallaron solo porque quedan otros.
3. Desde web, buscar lluvia y observacion por campo, fecha y marcador de prueba. Debe existir una carga de cada una, con usuario/cliente correctos. Abrir la foto adjunta; no alcanza con que aparezca su nombre.
4. Registrar IDs remotos visibles o pedir su comprobacion en la base de testing. Una unica carga manual no demuestra el comportamiento ante una respuesta perdida: ese escenario esta en el checklist avanzado.
5. Volver a entrar como A y comprobar que esas cargas no reaparecen pendientes. Con contador cero, **Sincronizar pendientes** queda deshabilitado; es esperado.

Esta primera pasada cubre captura, persistencia, reinicio, aislamiento y envio normal. No cierra por si sola etapa 3: faltan interrupcion parcial, concurrencia y errores controlados del checklist de seccion 7.

### 5.6. Pruebas avanzadas: como registrar lo que falta

El corte exacto entre subida de foto y confirmacion requiere observar requests o instrumentar testing. Desactivar red al azar no demuestra esa ventana. Para validar reutilizacion de metadata, registrar ID local, objeto de Storage y solicitudes de subida por intento, con asistencia de un desarrollador y sin copiar tokens/URLs firmadas a reportes.

Para concurrencia, preparar varios pendientes, iniciar envio y guardar otro mientras sigue activo; verificar que se confirma o permanece pendiente, sin perderse. Para cambio de cuenta durante envio, mantener el intento en vuelo y salir: ninguna respuesta de A debe aparecer en B. Si no se logra reproducir la ventana, marcar **No ejecutado**, no **Aprobado**.

Los fallos de cuota/almacenamiento y recuperacion legacy se preparan en un entorno controlado; no hace falta llenar el telefono ni borrar datos para la primera prueba. Registrar cada escenario no ejecutado como pendiente. Los tests automaticos cubren estas reglas, pero no sustituyen la evidencia nativa.

## 6. Probar en emulador Android

Si se usa Android Emulator, normalmente la IP especial para acceder al host es:

```env
EXPO_PUBLIC_API_URL="http://10.0.2.2:4000"
```

Esto depende del emulador. En Expo Go con celular real, usar la IP LAN de la PC.

## 7. Flujos mobile a validar

### Login y permisos

- [ ] Login por email/password real funciona y la API emite una sesion.
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

### Recorrido requerido de etapa 3 (pendiente en dispositivo)

Usar cuentas A/B de testing con cliente asociado y datos conocidos; no usar registros operativos reales.

- [ ] Ingresar como A con conexion, cortar red y guardar una precipitacion y una observacion con foto. Verificar contador y preservacion del contenido.
- [ ] Cerrar sesion; ingresar como B con conexion y verificar que no aparecen formularios, fotos ni pendientes de A, ni campos no autorizados para B. Repetir con otro cliente.
- [ ] Volver como A y comprobar que se recuperan los pendientes. Reiniciar la app, volver a autenticar con conexion y comprobar nuevamente antes de sincronizar.
- [ ] Restaurar red y enviar. Verificar en web/base de testing que cada ID local genera un solo registro y que las fotos se pueden abrir.
- [ ] Interrumpir envio despues de subir una foto o durante el POST; reintentar y comprobar reutilizacion de metadata guardada y ausencia de registros duplicados.
- [ ] Cerrar sesion durante una subida/envio: la respuesta en vuelo solo puede confirmar la cola de A; no deben comenzar nuevas solicitudes de A ni aparecer datos suyos en B.
- [ ] Guardar nuevos registros mientras se sincronizan otros y comprobar que permanecen en la cola; pulsar sincronizacion repetidamente no debe iniciar corridas simultaneas.
- [ ] Verificar errores de permisos/validacion y almacenamiento lleno: no se borra el pendiente ni se informa un guardado que fallo. No borrar almacenamiento del dispositivo para ocultar fallos.
- [ ] Si existen registros antiguos sin propietario, comprobar aviso y conservacion; no atribuirlos automaticamente a A o B.

Registrar dispositivo, plataforma, versiones, escenario y resultado antes de marcar este recorrido como aprobado.

Usar esta ficha como evidencia (no esta completada por los tests automaticos):

| Dato | Valor a registrar |
| --- | --- |
| Fecha, responsable y commit | Pendiente |
| Dispositivo, Android/iOS, Expo/app | Pendiente |
| API, cliente y usuarios de testing | Identificadores de prueba; sin passwords ni tokens |
| Cada escenario anterior | Aprobado/fallido, resultado observado e IDs locales/remotos |
| Fotos y reintentos | Confirmar apertura y cantidad de registros/subidas tras interrupcion |
| Incidencias | Pasos, resultado esperado/obtenido y evidencia sin informacion privada |

Repetir el cambio de sesion con formularios escritos y selector/camara abierto: despues de salir, ningun texto, foto o respuesta anterior debe aparecer en la nueva cuenta. El refactor de etapa 6 incorpora pruebas React de estos estados; no acredita permisos/archivos nativos reales.

## 8. Problemas comunes

| Sintoma | Que revisar |
| --- | --- |
| El QR dice proyecto incompatible | Expo Go debe soportar SDK 57; volver a seccion 0 y descarga oficial. No actualizar/downgradear dependencias de todo el repo sin revisar compatibilidad. |
| Se abre una web en lugar de la app | Se uso el launcher `dev` con `--web`. Usar terminal 2 de seccion 5 con `--go --lan`. |
| `/home` no abre en el telefono | API iniciada, IPv4 de la placa Wi-Fi correcta, misma red sin aislamiento y firewall de red privada. No usar `localhost`, IP de VPN ni direccion de Docker. |
| `/home` funciona pero el QR no carga | Revisar puerto 8082, terminal Expo activa y URL LAN del QR; API y Expo son servidores distintos. |
| La app abre pero el login falla | Ver error, email/password, base reactivada y configuracion API. El JWT rotado requiere iniciar sesion nuevamente. |
| Login correcto pero sin campos/formularios | Usar operador con cliente y campos asignados; el panel administrativo no presenta los mismos formularios. |
| Error de modulo nativo o version de React Native | Registrar error y versiones. Revisar compatibilidad SDK/Expo Go y dependencias nativas; puede requerir development build. Compilar no acredita que el modulo exista en Expo Go. |
| Error al abrir Expo sin red | Reabrir con red y autenticar; se valida persistencia de pendientes, no login/arranque completo offline. |

Expo `--tunnel` conecta el telefono al servidor de codigo cuando LAN falla, pero no publica automaticamente la API del puerto 4000 ni hace accesible una IPv4 privada desde datos moviles. Para esta primera prueba usar LAN y resolver conectividad de ambos servidores. Ver [CLI de Expo](https://docs.expo.dev/more/expo-cli/).

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
