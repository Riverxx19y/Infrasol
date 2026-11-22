# INFRASOL · Base técnica

Base móvil de Expo SDK 54 para Android e iOS. Sprint 1 incluye registro ciudadano y verificación de correo mediante la API independiente `INFRASOL-BACKEND`.

## Probar la aplicación

Desde `INFRASOL-SCRUM-NUEVO`, con Node.js 20.19.4 o posterior, npm y Expo Go compatible con SDK 54:

```sh
npm ci
```

Antes del primer arranque, crea el entorno local y completa las variables públicas de Firebase y `EXPO_PUBLIC_API_URL`:

```powershell
Copy-Item .env.example .env
npm start
```

Escanea el QR desde un teléfono en la misma red. También puedes ejecutar `npm run android` con un emulador Android disponible o `npm run ios` con un simulador en macOS. Para revisar la configuración y la compatibilidad de dependencias, ejecuta `npx expo config --type public` y `npx expo install --check`.

En la verificación de la base de Sprint 1, Expo validó las dependencias y Metro generó correctamente los bundles Hermes para Android e iOS con la inicialización de Firebase incluida.

## Infraestructura creada

| Archivo | Función |
| --- | --- |
| `package.json` y `package-lock.json` | Comandos, versiones directas y resolución reproducible. |
| `app.json` | Nombre, identificador de Expo, versión y plataformas. |
| `index.js` | Punto de entrada que registra `App` con `registerRootComponent`. |
| `App.js` | Raíz de la aplicación. |
| `src/navigation/RootNavigator.js` | Selección de registro, verificación o pantalla inicial según la sesión y `emailVerificado`. |
| `src/screens/StartScreen.js` | Pantalla de comprobación independiente, con componentes de React Native. |
| `config/firebase.js` | Validación del entorno e inicialización de Authentication con persistencia y Firestore. |
| `.env.example` | Nombres de las variables públicas requeridas, sin valores del proyecto. |
| `.gitignore` | Exclusiones para archivos generados, datos de entorno y archivos sensibles. |
| `README.md` | Arranque, configuración y límites técnicos. |

Dependencias directas: Expo SDK 54, Firebase 11.10.0 y AsyncStorage 2.2.0. La navegación actual selecciona una de tres pantallas sin instalar una biblioteca adicional. Las historias posteriores incorporarán sus propias funcionalidades.

## HU-01 · Configuración OTP

`registration.service.js` crea la cuenta en Firebase Authentication y el perfil `usuarios/{uid}` con `emailVerificado: false`. `RootNavigator` conecta las pantallas con `otp.gateway.js`, que obtiene el ID token vigente y llama a `POST /api/otp/solicitar`, `/verificar` y `/reenviar`. El backend genera, almacena, envía y verifica el código; el cliente solo presenta el formulario y el resultado. La navegación permanece en verificación hasta que Firestore indique `emailVerificado: true`.

`EXPO_PUBLIC_API_URL` contiene solo la dirección base de la API. La dirección `192.0.2.10` de `.env.example` es ilustrativa y debe reemplazarse en el `.env` local. Para un teléfono físico en la misma red, usa `http://<IP-LAN-del-equipo>:3000` (o el `PORT` configurado en Express); `localhost` en el teléfono apunta al propio teléfono. El backend debe escuchar en una interfaz accesible, como `HOST=0.0.0.0`, y el teléfono debe poder alcanzar ese puerto. Inicia primero el backend y luego reinicia Expo para que lea el `.env`. Para un backend desplegado, configura la URL pública HTTPS en el entorno de compilación de Expo. La configuración de Firebase Admin y la clave privada de EmailJS permanecen exclusivamente en el entorno del backend.

Si Firebase crea la cuenta y falla el envío, la sesión queda pendiente y la pantalla de verificación permite **Reenviar código** sin registrar otra cuenta. La sesión persiste al cerrar y reabrir la aplicación. Si el usuario cierra sesión, HU-02 deberá aportar el inicio de sesión para recuperar esa cuenta. Un error de conexión o una respuesta HTTP fallida se muestra en pantalla; no se anuncia un correo enviado sin confirmación de la API.

`firestore.rules` permite al ciudadano crear y leer su perfil no verificado, pero impide cualquier actualización o eliminación del perfil desde el cliente, incluidos cambios de `emailVerificado`, UID o rol. También bloquea el acceso cliente a los retos OTP. Los cambios futuros del perfil requerirán ampliar las reglas de forma controlada, limitando campos y valores permitidos. Son reglas completas para esta base mínima: antes de aplicarlas a un proyecto compartido deben integrarse con sus reglas actuales. No se han desplegado reglas ni servicios.

Ejecuta `npm run test:ci` para las pruebas del cliente, `npm run test:rules` para las reglas en el emulador local (requiere Firebase CLI) y `npx expo export --platform android --platform ios` para comprobar los bundles. Las pruebas del backend y su configuración están documentadas en el directorio hermano `INFRASOL-BACKEND`.

## HU-03 · Fotografías opcionales

El ciudadano puede adjuntar una fotografía desde cámara o galería. Si cancela la selección, el reporte se crea sin imagen. Si falla la subida, puede confirmar **Enviar sin foto** sin perder los campos del formulario. Una subida exitosa proporciona `fotoUrl` a `crearReporte`; las reglas actuales de Firestore ya aceptan ese campo opcional.

La aplicación envía el contenido base64 de la imagen a `POST /api/images/upload` en `INFRASOL-BACKEND`, usando `EXPO_PUBLIC_API_URL` y el Firebase ID Token de la sesión. El backend comprueba que la cuenta sea un ciudadano verificado, valida JPEG, PNG o WebP, y sube a ImgBB con `IMGBB_API_KEY` guardada exclusivamente en su entorno. La aplicación acepta `fotoUrl` solamente si es una URL HTTPS válida de `i.ibb.co`; nunca necesita una clave ImgBB. Las fotos de más de 5 MiB se rechazan antes de enviarse y los errores HTTP 413 indican que debe elegirse una imagen más pequeña. El backend limita el cuerpo HTTP a 7 MiB.

Para una prueba real, configura la URL accesible del backend en el `.env` local de Expo, configura Firebase Admin e `IMGBB_API_KEY` en el entorno privado del backend, e inicia ambos servicios. La cuenta de prueba debe tener un perfil `usuarios/{uid}` con `rol: 'ciudadano'` y `emailVerificado: true`. En un teléfono físico comprueba los permisos de cámara y galería, la vista previa, la subida y el envío sin fotografía cuando falle la conexión. Las pruebas automatizadas simulan el backend y no realizan subidas reales.
