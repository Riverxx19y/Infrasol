import React from 'react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { act, create } from 'react-test-renderer';

jest.mock('../../config/firebase', () => ({ auth: { currentUser: { uid: 'citizen' } }, db: {} }));
jest.mock('../services/registration.service', () => ({}));
jest.mock('../services/auth.service', () => ({}));
jest.mock('../services/location.service', () => ({}));
jest.mock('../services/photo.service', () => ({}));
jest.mock('../services/reports.service', () => ({}));
jest.mock('../services/reportesCercanos.service', () => ({}));
jest.mock('../services/apoyos.gateway', () => ({}));
jest.mock('../services/mapReports.service', () => ({ obtenerReportesActivos: jest.fn() }));
jest.mock('../hooks/useAdminReports', () => ({ useAdminReports: () => ({ reportes: [] }) }));
jest.mock('../hooks/useAdminStats', () => ({ useAdminStats: () => ({}) }));
jest.mock('../hooks/useMisReportes', () => ({ useMisReportes: () => ({ status: 'ready', reportes: [] }) }));
jest.mock('../hooks/useNotificaciones', () => ({ useNotificaciones: jest.fn() }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView' }));

const colors = {
  light: { background: '#f4f6fa', surface: '#ffffff', text: '#111827', mutedText: '#384250', primary: '#1646a1', onPrimary: '#ffffff', border: '#637899', danger: '#7f1d1d' },
  dark: { background: '#101827', surface: '#172132', text: '#f4f6fa', mutedText: '#d1d5db', primary: '#adcaff', onPrimary: '#101827', border: '#637899', danger: '#fecaca' },
};
let theme;
jest.doMock('./ThemeProvider', () => ({ useTheme: () => ({ theme, colors: colors[theme] }) }),
  { virtual: !existsSync(join(__dirname, 'ThemeProvider.js')) });

const RegisterScreen = require('../screens/auth/RegisterScreen').default;
const LoginScreen = require('../screens/auth/LoginScreen').default;
const VerificationScreen = require('../screens/auth/VerificationScreen').default;
const RestrictedAccessScreen = require('../screens/auth/RestrictedAccessScreen').default;
const StartScreen = require('../screens/StartScreen').default;
const CreateReportScreen = require('../screens/reports/CreateReportScreen').default;
const MapScreen = require('../screens/map/MapScreen').default;
const MyReportsScreen = require('../screens/reports/MyReportsScreen').default;
const NotificationsScreen = require('../screens/notifications/NotificationsScreen').default;
const AdminScreen = require('../screens/admin/AdminScreen').default;
const { obtenerReportesActivos } = require('../services/mapReports.service');
const { useNotificaciones } = require('../hooks/useNotificaciones');
const { crearMarcadores } = require('../utils/mapReports');

global.IS_REACT_ACT_ENVIRONMENT = true;
const user = { uid: 'citizen' };
const props = { uid: user.uid, user, onBack: () => {}, onSignOut: () => {} };
const style = (node) => StyleSheet.flatten(node?.props.style) || {};
const solid = (value) => typeof value === 'string' && /^(#[\da-f]{3}|#[\da-f]{6}|white|black)$/i.test(value);

function foreground(node) {
  for (let current = node; current; current = current.parent) {
    if (solid(style(current).color)) return style(current).color;
  }
  return '#000000'; // Color de texto nativo cuando no se configura explícitamente.
}

function background(node) {
  for (let current = node; current; current = current.parent) {
    if (solid(style(current).backgroundColor)) return style(current).backgroundColor;
  }
  return undefined;
}

function luminance(color) {
  const value = color.toLowerCase().replace('white', '#ffffff').replace('black', '#000000').slice(1);
  const hex = value.length === 3 ? [...value].map((digit) => digit.repeat(2)).join('') : value;
  const channels = hex.match(/../g).map((channel) => parseInt(channel, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

function expectReadable(node) {
  const bg = background(node);
  expect(bg).toBeDefined();
  expect(contrast(foreground(node), bg)).toBeGreaterThanOrEqual(4.5);
}

let tree;
const markRead = jest.fn();
const notification = { id: 'n1', tipo: 'cambio_estado', reporteId: 'r1', leida: false, estadoAnterior: 'Pendiente', estadoNuevo: 'Asignado' };
const report = { id: 'r1', tipo: 'Alumbrado', prioridad: 'Alta', estado: 'Pendiente', lat: 9.3047, lng: -75.3978, usuarioId: 'other' };

beforeEach(() => {
  jest.clearAllMocks();
  obtenerReportesActivos.mockResolvedValue([]);
  useNotificaciones.mockReturnValue({ status: 'ready', notificaciones: [notification], pendientes: 1, marcarLeida: markRead });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = undefined;
});

async function render(Screen, mode) {
  theme = mode;
  if (tree) await act(async () => { tree.update(<Screen {...props} />); });
  else await act(async () => { tree = create(<Screen {...props} />); });
}

function surface() {
  return tree.root.findAll((node) => typeof node.type === 'string' && solid(style(node).backgroundColor))[0];
}

test.each(['light', 'dark'])('la paleta %s real mantiene contraste en texto, botones y errores', (mode) => {
  const path = join(__dirname, 'palettes.js');
  const { palettes } = existsSync(path) ? require('./palettes') : {};
  const palette = palettes?.[mode];
  expect(palette).toEqual(expect.any(Object));
  for (const [fg, bg] of [
    ['text', 'background'], ['text', 'surface'], ['mutedText', 'surface'],
    ['onPrimary', 'primary'], ['danger', 'surface'],
  ]) {
    expect(solid(palette[fg]) && solid(palette[bg])).toBe(true);
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  }
});

test.each([
  ['registro', RegisterScreen], ['inicio de sesión', LoginScreen], ['verificación', VerificationScreen],
  ['acceso restringido', RestrictedAccessScreen], ['Inicio', StartScreen], ['crear reporte', CreateReportScreen],
  ['mapa', MapScreen], ['historial', MyReportsScreen], ['notificaciones', NotificationsScreen], ['administración', AdminScreen],
])('%s cambia su fondo al aplicar la paleta oscura', async (_, Screen) => {
  await render(Screen, 'light');
  const light = style(surface()).backgroundColor;
  await render(Screen, 'dark');
  const dark = style(surface()).backgroundColor;
  expect(light).toBeDefined();
  expect(dark).toBeDefined();
  expect(luminance(dark)).toBeLessThan(luminance(light));
});

test.each(['light', 'dark'])('en %s se leen el encabezado, la acción y el estado de una notificación', async (mode) => {
  await render(NotificationsScreen, mode);
  const text = tree.root.findAllByType(Text);
  const heading = text.find(({ props }) => props.accessibilityRole === 'header');
  const readState = text.find(({ props }) => props.children === 'Pendiente de lectura');
  const button = tree.root.findByProps({ accessibilityLabel: 'Marcar como leída: n1' });
  expectReadable(heading);
  expectReadable(readState);
  expectReadable(button.findByType(Text));
  expect(markRead).not.toHaveBeenCalled();
});

test('cambiar el tema mantiene el símbolo, la prioridad y la consulta del marcador', async () => {
  obtenerReportesActivos.mockResolvedValue([report]);
  const expected = crearMarcadores([report])[0].estilo;
  const marker = () => tree.root.findAllByType(TouchableOpacity)
    .find(({ props }) => props.accessibilityLabel === 'Reporte: Alumbrado');
  const assertMarker = () => {
    expect(marker().findByType(Text).props.children).toBe('💡');
    const markerColors = marker().findAll((node) => solid(style(node).backgroundColor))
      .map((node) => style(node).backgroundColor);
    expect(markerColors).toEqual(expect.arrayContaining([expected.categoria, expected.colorPrioridad]));
  };
  await render(MapScreen, 'light');
  const layout = tree.root.find((node) => typeof node.props.onLayout === 'function');
  act(() => layout.props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } }));
  assertMarker();
  await render(MapScreen, 'dark');
  assertMarker();
  act(() => marker().props.onPress());
  expect(tree.root.findAllByType(Text).some(({ props }) => props.children === 'Alta')).toBe(true);
  expect(obtenerReportesActivos).toHaveBeenCalledTimes(1);
});
