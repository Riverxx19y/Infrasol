import { existsSync } from 'node:fs';
import { join } from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const path = join(__dirname, 'themePreference.js');
const preference = existsSync(path) ? require('./themePreference') : {};
const key = '@infrasol/theme';

beforeEach(() => jest.resetAllMocks());

test.each([[null, 'light'], ['light', 'light'], ['dark', 'dark'], ['sepia', 'light']])(
  'carga %p como %s desde la clave del dispositivo', async (saved, expected) => {
    expect(preference.loadThemePreference).toEqual(expect.any(Function));
    AsyncStorage.getItem.mockResolvedValue(saved);
    await expect(preference.loadThemePreference()).resolves.toBe(expected);
    expect(AsyncStorage.getItem.mock.calls).toEqual([[key]]);
  },
);

test('si falla la lectura, inicia en claro sin sobreescribir el dato', async () => {
  expect(preference.loadThemePreference).toEqual(expect.any(Function));
  AsyncStorage.getItem.mockRejectedValue(new Error('Lectura no disponible'));
  await expect(preference.loadThemePreference()).resolves.toBe('light');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('guarda oscuro y claro en la misma clave, sin datos de cuenta', async () => {
  expect(preference.saveThemePreference).toEqual(expect.any(Function));
  AsyncStorage.setItem.mockResolvedValue(undefined);
  await preference.saveThemePreference('dark');
  await preference.saveThemePreference('light');
  expect(AsyncStorage.setItem.mock.calls).toEqual([[key, 'dark'], [key, 'light']]);
});

test('notifica al proveedor el fallo de escritura', async () => {
  expect(preference.saveThemePreference).toEqual(expect.any(Function));
  AsyncStorage.setItem.mockRejectedValue(new Error('Disco lleno'));
  await expect(preference.saveThemePreference('dark')).rejects.toThrow();
});
