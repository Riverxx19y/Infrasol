import React from 'react';
import { StatusBar, Switch, TouchableOpacity } from 'react-native';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';

jest.mock('../../config/firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), onSnapshot: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('../screens/auth/RegisterScreen', () => 'RegisterScreen');
jest.mock('../screens/auth/VerificationScreen', () => 'VerificationScreen');
jest.mock('../screens/admin/AdminScreen', () => 'AdminScreen');
jest.mock('../screens/reports/CreateReportScreen', () => 'CreateReportScreen');
jest.mock('../screens/map/MapScreen', () => 'MapScreen');
jest.mock('../screens/reports/MyReportsScreen', () => 'MyReportsScreen');
jest.mock('../screens/notifications/NotificationsScreen', () => 'NotificationsScreen');
jest.mock('../hooks/useNotificaciones', () => ({ useNotificaciones: () => ({ pendientes: 2 }) }));

const App = require('../../App').default;
global.IS_REACT_ACT_ENVIRONMENT = true;
let tree;
const pressable = (label) => tree.root.findAllByType(TouchableOpacity)
  .find(({ props }) => props.accessibilityLabel === label);
const themeSwitch = () => tree.root.findAllByType(Switch)
  .find(({ props }) => props.accessibilityLabel === 'Modo oscuro');
const statusStyle = () => tree.root.findAllByType(StatusBar).at(-1)?.props.barStyle;

async function mount(saved = null) {
  AsyncStorage.getItem.mockResolvedValue(saved);
  await act(async () => { tree = create(<App />); });
}

async function session(uid, rol = 'ciudadano', emailVerificado = true) {
  await act(async () => { onAuthStateChanged.mock.calls.at(-1)[1](uid ? { uid } : null); });
  if (uid) await act(async () => {
    onSnapshot.mock.calls.at(-1)[1]({ exists: () => true, data: () => ({ rol, emailVerificado }) });
  });
}

async function press(label) {
  expect(pressable(label)).toBeDefined();
  await act(async () => { await pressable(label).props.onPress(); });
}

async function choose(value) {
  expect(themeSwitch()).toBeDefined();
  await act(async () => { await themeSwitch().props.onValueChange(value); });
  expect(themeSwitch().props.value).toBe(value);
}

beforeEach(() => {
  jest.resetAllMocks();
  onAuthStateChanged.mockReturnValue(() => {});
  onSnapshot.mockReturnValue(() => {});
  AsyncStorage.setItem.mockResolvedValue(undefined);
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = undefined;
});

test('el ciudadano entra a Perfil desde Inicio, elige ambos temas y vuelve', async () => {
  await mount();
  await session('owner');
  await press('Perfil');
  expect(JSON.stringify(tree.toJSON())).toContain('Perfil');
  expect(themeSwitch()?.props.value).toBe(false);
  await choose(true);
  await choose(false);
  expect(AsyncStorage.setItem.mock.calls).toEqual([['@infrasol/theme', 'dark'], ['@infrasol/theme', 'light']]);
  await press('Volver al inicio');
  expect(pressable('Crear reporte')).toBeDefined();
});

test('el StatusBar global usa la preferencia al arrancar incluso antes de iniciar sesión', async () => {
  await mount('dark');
  await session(null);
  expect(statusStyle()).toBe('light-content');
});

test('el StatusBar reacciona a los dos cambios sin remontar la sesión', async () => {
  await mount();
  await session('owner');
  await press('Perfil');
  expect(statusStyle()).toBe('dark-content');
  await choose(true);
  expect(statusStyle()).toBe('light-content');
  await choose(false);
  expect(statusStyle()).toBe('dark-content');
  expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  expect(signOut).not.toHaveBeenCalled();
});

test('cambiar de cuenta cierra el perfil anterior y mantiene el tema del dispositivo', async () => {
  await mount();
  await session('owner');
  await press('Perfil');
  await choose(true);
  await session(null);
  expect(tree.root.findAllByType('RegisterScreen')).toHaveLength(1);
  expect(statusStyle()).toBe('light-content');
  await session('otro');
  expect(pressable('Crear reporte')).toBeDefined();
  await press('Perfil');
  expect(themeSwitch()?.props.value).toBe(true);
  expect(AsyncStorage.setItem.mock.calls).toEqual([['@infrasol/theme', 'dark']]);
});

test('tras cambiar el tema las rutas conservan el ciudadano de reportes y notificaciones', async () => {
  await mount();
  await session('owner');
  await press('Perfil');
  await choose(true);
  await press('Volver al inicio');
  await press('Crear reporte');
  const report = tree.root.findByType('CreateReportScreen');
  expect(report.props.user.uid).toBe('owner');
  await act(async () => { report.props.onBack(); });
  await press('Notificaciones');
  expect(tree.root.findByType('NotificationsScreen').props.uid).toBe('owner');
});
