jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

jest.mock('firebase/app', () => ({
  getApp: jest.fn(() => ({ name: 'existing-app' })),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ name: 'existing-auth' })),
  getReactNativePersistence: jest.fn(() => ({ name: 'async-storage-persistence' })),
  initializeAuth: jest.fn(() => ({ name: 'test-auth' })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ name: 'test-db' })),
}));

const variables = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const originalValues = Object.fromEntries(
  variables.map((name) => [name, process.env[name]]),
);

afterEach(() => {
  jest.resetModules();
  for (const name of variables) {
    if (originalValues[name] === undefined) delete process.env[name];
    else process.env[name] = originalValues[name];
  }
});

test('enumera las variables faltantes antes de inicializar Firebase', () => {
  for (const name of variables) delete process.env[name];

  expect(() => require('./firebase')).toThrow(
    `[Firebase] Faltan variables públicas requeridas: ${variables.join(', ')}`,
  );
  expect(require('firebase/app').initializeApp).not.toHaveBeenCalled();
});

test('inicializa Authentication con persistencia en AsyncStorage y Firestore', () => {
  for (const name of variables) process.env[name] = `prueba-${name}`;

  const { app, auth, db } = require('./firebase');
  const { initializeApp } = require('firebase/app');
  const { getReactNativePersistence, initializeAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  expect(initializeApp).toHaveBeenCalledTimes(1);
  expect(getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);
  expect(initializeAuth).toHaveBeenCalledWith(app, {
    persistence: { name: 'async-storage-persistence' },
  });
  expect(getFirestore).toHaveBeenCalledWith(app);
  expect(auth).toEqual({ name: 'test-auth' });
  expect(db).toEqual({ name: 'test-db' });
});
