# INFRASOL · Base técnica

Base móvil de Expo SDK 54 para Android e iOS. Al abrirla aparece **INFRASOL** y el mensaje **Sprint 0 · Expo SDK 54 en marcha**. Sprint 1 añade la inicialización de Firebase Authentication y Firestore mediante variables públicas de entorno, sin agregar todavía pantallas de autenticación.

## Probar la aplicación

Desde `INFRASOL-SCRUM-NUEVO`, con Node.js 20.19.4 o posterior, npm y Expo Go compatible con SDK 54:

```sh
npm ci
```

Antes del primer arranque, crea el entorno local y completa únicamente los valores públicos del proyecto Firebase:

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
| `index.js` | Punto de entrada que registra `App` con `registerRootComponent`, como en la referencia. |
| `App.js` | Raíz de la aplicación. |
| `src/navigation/RootNavigator.js` | Punto donde se añadirán rutas. Por ahora monta una sola pantalla. |
| `src/screens/StartScreen.js` | Pantalla de comprobación independiente, con componentes de React Native. |
| `config/firebase.js` | Validación del entorno e inicialización de Authentication con persistencia y Firestore. |
| `.env.example` | Nombres de las variables públicas requeridas, sin valores del proyecto. |
| `.gitignore` | Exclusiones para archivos generados, datos de entorno y archivos sensibles. |
| `README.md` | Arranque y trazabilidad de integración. |

Dependencias directas: `expo` `54.0.35`, `react` `19.1.0`, `react-native` `0.81.5`, `firebase` `11.10.0` y `@react-native-async-storage/async-storage` `2.2.0`. Las versiones coinciden con las fijadas en la referencia. La ruta única prescinde de una biblioteca de navegación. Expo aporta la configuración predeterminada de Metro y Babel. El soporte web queda pendiente de una historia que lo requiera.

## Integración por historia

La referencia usa el mismo punto de entrada, pero su `App.js` monta los proveedores de autenticación y tema. Sus navegadores registran pantallas públicas, privadas y administrativas, y su `SplashScreen.js` depende del tema. La base adopta la estructura de entrada y mantiene `src/navigation` como punto de integración. Los siguientes archivos de `INFRASOL-SCRUM` son candidatos a reutilización por historia, según el [Sprint Backlog ajustado](../Scrum/INFRASOL_Sprint_Backlogs_Ajustados.xlsx).

| Sprint | Historia | Código de referencia a evaluar |
| --- | --- | --- |
| 1 | HU-01 y HU-02 · Registro, verificación e inicio de sesión | La base de Firebase ya está configurada. Quedan pendientes `src/screens/auth/`, `src/contexts/AuthContext.js`, `src/hooks/useAuth.js` y las operaciones aplicables de `src/services/auth.service.js`. EmailJS todavía no se integra. |
| 2 | HU-03 · Crear reporte con ubicación y foto | `src/screens/reports/ReportScreen.js`, `ReportSuccessScreen.js` y las operaciones de creación de `src/services/reports.service.js`. |
| 3 | HU-04 · Mapa, HU-05 · Apoyo y duplicados, HU-07 · Historial | `src/screens/map/MapScreen.js`, `src/components/map/`, `MapaComponent.js`, `src/utils/geo.js`, `src/screens/home/HomeScreen.js`, `src/components/reports/ReportCard.js` y las operaciones correspondientes de `reports.service.js`. |
| 4 | HU-09 · Cambio de estado, HU-08 · Panel y estadísticas, HU-06 · Notificaciones | `src/screens/admin/AdminScreen.js`, `EstadisticasScreen.js`, `src/screens/notifications/NotificationsScreen.js` y las operaciones de estado y notificaciones en `reports.service.js`. |
| 5 | HU-11 · Recuperación de contraseña, HU-10 · Modo oscuro | Flujo de recuperación de `LoginScreen.js` y `auth.service.js`, `src/contexts/ThemeContext.js`, `src/constants/theme.js` y el selector de `src/screens/profile/ProfileScreen.js`. |

Integra solo las funciones y dependencias que exige cada historia. Los servicios de autenticación y reportes agrupan operaciones de varios sprints, así que su reutilización requiere revisar cada operación y sus criterios de aceptación. Chat, exportación, moderación y otras funciones de la referencia quedan pendientes de una historia aplicable. Jest, CI y Firestore Emulator corresponden a las tareas de preparación técnica transversal del backlog y quedan pendientes.

Los valores públicos de la referencia se guardan únicamente en el `.env` local ignorado. Los archivos originales `firebaseConfig.js`, `config/firebase.js`, `config/admin.js`, `eas.json`, las configuraciones locales y `scripts/crearAdminsEntidades.js` permanecen en la referencia. Las credenciales administrativas deben mantenerse fuera del código cliente.
