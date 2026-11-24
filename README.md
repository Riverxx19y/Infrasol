# INFRASOL

Aplicación móvil para que los ciudadanos de Sincelejo reporten deficiencias de la infraestructura vial y de los servicios públicos, las vean en un mapa y sigan su atención. Los administradores gestionan el estado de los reportes y consultan estadísticas generales.

Proyecto de la Electiva Profesional en Ingeniería de Software (CECAR), desarrollado con Scrum, TDD e integración continua.

[![CI](https://github.com/Riverxx19y/Infrasol/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Riverxx19y/Infrasol/actions/workflows/ci.yml)
**Versión actual:** [v1.0.0](https://github.com/Riverxx19y/Infrasol/releases/tag/v1.0.0)

## Funcionalidades

| Sprint | Historia | Funcionalidad |
| --- | --- | --- |
| 1 | HU-01 | Registro con correo y contraseña y verificación por código OTP |
| 1 | HU-02 | Inicio de sesión, persistencia de sesión y acceso por rol |
| 2 | HU-03 | Reportes con ubicación GPS, descripción y fotografía opcional |
| 3 | HU-04 | Mapa de reportes activos con marcadores por categoría y clústeres |
| 3 | HU-05 | Apoyo único a reportes y detección de reportes cercanos (≤ 150 m) |
| 3 | HU-07 | Historial de reportes propios con estado y paginación |
| 4 | HU-06 | Notificaciones por cambio de estado con contador de pendientes |
| 4 | HU-08 | Panel administrativo con estadísticas generales |
| 4 | HU-09 | Cambio de estado de reportes por el administrador |
| 5 | HU-10 | Modo oscuro con preferencia persistente |
| 5 | HU-11 | Recuperación de contraseña por enlace de Firebase Authentication |

## Arquitectura

El sistema tiene dos repositorios:

- **Esta aplicación** — React Native 0.81 con Expo SDK 54, Firebase Authentication y Cloud Firestore. Lee y escribe en Firestore con las reglas de `firestore.rules`.
- **[INFRASOL-BACKEND](https://github.com/Riverxx19y/INFRASOL-BACKEND)** — API Express 5 con Firebase Admin para las operaciones que no deben hacerse desde el cliente: verificación OTP (HU-01), subida de imágenes a ImgBB (HU-03), apoyos (HU-05), cambio de estado y estadísticas (HU-08 y HU-09).

La aplicación se identifica ante el backend con el ID token de Firebase de la sesión. Las claves privadas (Firebase Admin, EmailJS, ImgBB y el secreto OTP) viven solo en el entorno del backend.

## Requisitos

- Node.js 22 y npm 10
- Expo Go compatible con SDK 54, o un emulador de Android
- El backend en ejecución para registro, imágenes, apoyos y administración
- Para las pruebas de reglas: Java 21 y Firebase CLI (`npm install -g firebase-tools`)

## Puesta en marcha

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Completa el `.env` con la configuración web de Firebase y la URL del backend:

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_*` | Configuración web del proyecto de Firebase |
| `EXPO_PUBLIC_API_URL` | Dirección base del backend, por ejemplo `http://<IP-LAN-del-equipo>:3000` |

En un teléfono físico, `localhost` apunta al propio teléfono: usa la IP de tu equipo en la red local y arranca el backend con `HOST=0.0.0.0`. Inicia primero el backend y después reinicia Expo para que lea el `.env`.

Escanea el QR con Expo Go o ejecuta `npm run android` con un emulador disponible.

## Pruebas

| Comando | Qué ejecuta |
| --- | --- |
| `npm test` | Pruebas unitarias, de componentes y de navegación con Jest |
| `npm run test:ci` | Lo mismo, de forma secuencial y con cobertura (igual que el CI) |
| `npm run test:rules` | Pruebas de `firestore.rules` contra el emulador de Firestore |

Las pruebas no usan servicios reales: Firebase, el backend, la ubicación y la cámara se sustituyen por dobles de prueba o por el emulador. Las pruebas del backend están en su propio repositorio (`npm test` y `npm run test:integration`).

## Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada Pull Request y en cada push a `develop` y `main`:

1. Instalación limpia con `npm ci` (Node 22, npm 10.9.4).
2. Jest con cobertura (`npm run test:ci`).
3. Pruebas de reglas con el emulador de Firestore (`npm run test:rules`).
4. Publicación del informe de cobertura como artefacto.

Un Pull Request solo se fusiona con el CI en verde y la aprobación de otro integrante.

## Flujo de trabajo

- **Ramas:** `main` (versiones estables), `develop` (integración) y una rama por historia, `feature/HU-XX-descripcion`, creada desde `develop`.
- **TDD:** cada historia tiene tres commits separados, uno por fase:
  - `test: agrega pruebas RED de … HU-XX`
  - `feat: implementa … HU-XX`
  - `refactor: … HU-XX`
- **Integración:** Pull Request hacia `develop` con revisión cruzada; las versiones se publican en `main` y se etiquetan como releases (`v1.0.0`).

## Estructura

```
config/            Inicialización de Firebase y pruebas de índices
src/components/    Componentes del mapa y de los reportes
src/hooks/         Lógica de estado compartida (notificaciones, historial, administración)
src/navigation/    RootNavigator: pantalla según sesión, rol y verificación
src/screens/       Pantallas de autenticación, inicio, reportes, mapa, notificaciones, perfil y administración
src/services/      Acceso a Firebase y al backend, validaciones y mensajes de error
src/theme/         Paletas claro/oscuro, ThemeProvider y tokens de diseño
src/utils/         Geometría del mapa, formato y estados de los reportes
tests/             Pruebas de reglas de Firestore (emulador)
firestore.rules    Reglas de seguridad de Firestore
firestore.indexes.json  Índices compuestos de Firestore
```

## Equipo

| Integrante | Historias |
| --- | --- |
| Oscar David Rivera Meza | HU-02, HU-03 (fotografías), HU-06, HU-07 y HU-11 |
| Alex David González Monterroza | HU-01, HU-05, HU-09 y HU-10 |
| Camilo Andrés Rodríguez Arrieta | HU-03, HU-04 y HU-08 |
