import React from 'react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const path = join(__dirname, 'ThemeProvider.js');
const { ThemeProvider, useTheme } = existsSync(path) ? require('./ThemeProvider') : {};
global.IS_REACT_ACT_ENVIRONMENT = true;

let tree;
let current;
let saved;
function Probe() {
  current = useTheme();
  return null;
}

async function mount() {
  expect(ThemeProvider).toEqual(expect.any(Function));
  expect(useTheme).toEqual(expect.any(Function));
  await act(async () => { tree = create(<ThemeProvider><Probe /></ThemeProvider>); });
}

function unmount() {
  if (tree) act(() => tree.unmount());
  tree = undefined;
}

beforeEach(() => {
  jest.resetAllMocks();
  saved = null;
  AsyncStorage.getItem.mockImplementation(async () => saved);
  AsyncStorage.setItem.mockImplementation(async (_, value) => { saved = value; });
});
afterEach(unmount);

test('publica tema claro por defecto', async () => {
  await mount();
  expect(current.theme).toBe('light');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('propaga ambos cambios y recupera el último tema tras remontar el proveedor', async () => {
  await mount();
  await act(async () => { await current.setTheme('dark'); });
  expect(current.theme).toBe('dark');
  unmount();
  await mount();
  expect(current.theme).toBe('dark');
  await act(async () => { await current.setTheme('light'); });
  expect(current.theme).toBe('light');
  unmount();
  await mount();
  expect(current.theme).toBe('light');
});

test('si no puede leer, conserva el tema claro y el selector sigue operativo', async () => {
  AsyncStorage.getItem.mockRejectedValueOnce(new Error('Lectura no disponible'));
  await mount();
  expect(current.theme).toBe('light');
  await act(async () => { await current.setTheme('dark'); });
  expect(current.theme).toBe('dark');
});

test('si falla la escritura, informa el error y admite un reintento', async () => {
  await mount();
  AsyncStorage.setItem.mockRejectedValueOnce(new Error('Escritura no disponible'));
  await act(async () => { await current.setTheme('dark'); });
  expect(current.persistenceError).toBeTruthy();
  expect(saved).toBeNull();
  await act(async () => { await current.setTheme('dark'); });
  expect(current.persistenceError).toBeFalsy();
  expect(saved).toBe('dark');
});
