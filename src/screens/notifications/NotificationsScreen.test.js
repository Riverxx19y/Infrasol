import React from 'react';
import { act, create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../hooks/useNotificaciones', () => ({ useNotificaciones: jest.fn() }), { virtual: true });
const { useNotificaciones } = require('../../hooks/useNotificaciones');
const Screen = existsSync(join(__dirname, 'NotificationsScreen.js'))
  ? require('./NotificationsScreen').default : null;
global.IS_REACT_ACT_ENVIRONMENT = true;

const change = { id: 'estado_r1_1', tipo: 'cambio_estado', usuarioId: 'owner', reporteId: 'r1',
  estadoAnterior: 'Pendiente', estadoNuevo: 'En revisión', fecha: { toDate: () => new Date('2026-11-23T12:00:00Z') }, leida: false };
const support = { id: 'r2_other', tipo: 'apoyo', usuarioId: 'owner', reporteId: 'r2',
  apoyadorId: 'other', fecha: { toDate: () => new Date('2026-11-22T12:00:00Z') } };
let model;
function render() {
  expect(Screen).toEqual(expect.any(Function));
  let tree;
  act(() => { tree = create(<Screen uid="owner" onBack={jest.fn()} />); });
  return tree;
}
const visible = (tree) => JSON.stringify(tree.toJSON());

beforeEach(() => {
  jest.clearAllMocks();
  model = { status: 'ready', notificaciones: [change, support], pendientes: 1,
    marcarLeida: jest.fn().mockResolvedValue(undefined), reintentar: jest.fn() };
  useNotificaciones.mockImplementation(() => model);
});

test('muestra cambio de estado, reporte, fecha y apoyo en orden descendente', () => {
  const tree = render();
  try {
    const output = visible(tree);
    expect(output).toMatch(/Pendiente/);
    expect(output).toMatch(/En revisión/);
    expect(output).toMatch(/r1/);
    expect(output).toMatch(/r2/);
    expect(output).toMatch(/apoy/i);
    expect(output.indexOf('r1')).toBeLessThan(output.indexOf('r2'));
    expect(output).toMatch(/2026|nov|11/i);
  } finally { act(() => tree.unmount()); }
});

test('distingue avisos pendientes de leídos y permite marcar uno propio', async () => {
  model.notificaciones = [change, { ...change, id: 'estado_r1_2', leida: true }];
  const tree = render();
  try {
    expect(visible(tree)).toMatch(/leíd|pendiente|nuevo/i);
    const button = tree.root.findAllByType(TouchableOpacity).find((node) =>
      /marcar.*leíd/i.test(node.props.accessibilityLabel || ''));
    expect(button).toBeDefined();
    await act(async () => button.props.onPress());
    expect(model.marcarLeida).toHaveBeenCalledWith('estado_r1_1');
  } finally { act(() => tree.unmount()); }
});

test('muestra carga y vacío como estados diferentes', () => {
  model.status = 'loading'; model.notificaciones = [];
  let tree = render();
  expect(visible(tree)).toMatch(/cargando/i);
  act(() => tree.unmount());
  model.status = 'ready';
  tree = render();
  expect(visible(tree)).toMatch(/no tienes|sin notificaciones|aún no/i);
  act(() => tree.unmount());
});

test('muestra error y permite reintentar', () => {
  model.status = 'error'; model.notificaciones = [];
  const tree = render();
  try {
    expect(visible(tree)).toMatch(/error|no se pudieron/i);
    const retry = tree.root.findAllByType(TouchableOpacity).find((node) =>
      /reintentar/i.test(node.props.accessibilityLabel || ''));
    expect(retry).toBeDefined();
    act(() => retry.props.onPress());
    expect(model.reintentar).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});
