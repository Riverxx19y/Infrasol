import React from 'react';
import { act, create } from 'react-test-renderer';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../services/notifications.service', () => ({
  suscribirNotificaciones: jest.fn(), marcarNotificacionLeida: jest.fn(),
}));

const { suscribirNotificaciones, marcarNotificacionLeida } = require('../services/notifications.service');
const implementation = existsSync(join(__dirname, 'useNotificaciones.js'))
  ? require('./useNotificaciones') : {};
const useNotificaciones = implementation.useNotificaciones;
global.IS_REACT_ACT_ENVIRONMENT = true;

let current;
let listeners;
let stops;
function Probe({ uid }) {
  current = useNotificaciones(uid);
  return null;
}
function mount(uid = 'owner') {
  expect(useNotificaciones).toEqual(expect.any(Function));
  let tree;
  act(() => { tree = create(<Probe uid={uid} />); });
  return tree;
}
function emit(items, index = listeners.length - 1) {
  act(() => { listeners[index].next(items); });
}
const status = (id, leida, usuarioId = 'owner') => ({ id, usuarioId, tipo: 'cambio_estado', leida });

beforeEach(() => {
  jest.clearAllMocks();
  current = null;
  listeners = [];
  stops = [];
  suscribirNotificaciones.mockImplementation((next, error) => {
    listeners.push({ next, error });
    const stop = jest.fn();
    stops.push(stop);
    return stop;
  });
  marcarNotificacionLeida.mockResolvedValue(undefined);
});

test('sin avisos muestra cero y usa una sola suscripción', () => {
  const tree = mount();
  emit([]);
  expect(current.pendientes).toBe(0);
  expect(current.status).toBe('ready');
  expect(suscribirNotificaciones).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

test('cuenta solo cambios de estado con leida !== true, incluidos históricos', () => {
  const tree = mount();
  emit([status('a', false), status('b', undefined), status('c', true),
    { id: 'support', usuarioId: 'owner', tipo: 'apoyo' }]);
  expect(current.pendientes).toBe(2);
  act(() => tree.unmount());
});

test('actualiza el badge cuando llega otro snapshot y cuando se marca como leído', async () => {
  const tree = mount();
  emit([status('a', false)]);
  expect(current.pendientes).toBe(1);
  emit([status('a', false), status('b', false)]);
  expect(current.pendientes).toBe(2);
  expect(current.marcarLeida).toEqual(expect.any(Function));
  await act(async () => { await current.marcarLeida('a'); });
  emit([status('a', true), status('b', false)]);
  expect(marcarNotificacionLeida).toHaveBeenCalledWith('a');
  expect(current.pendientes).toBe(1);
  act(() => tree.unmount());
});

test('un error se muestra y reintentar crea un solo listener nuevo', () => {
  const tree = mount();
  act(() => listeners[0].error(new Error('red')));
  expect(current.status).toBe('error');
  expect(current.reintentar).toEqual(expect.any(Function));
  act(() => current.reintentar());
  expect(suscribirNotificaciones).toHaveBeenCalledTimes(2);
  expect(stops[0]).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

test('al cambiar de usuario descarta avisos previos y cancela la suscripción anterior', () => {
  const tree = mount();
  emit([status('a', false)]);
  act(() => tree.update(<Probe uid="other" />));
  expect(stops[0]).toHaveBeenCalledTimes(1);
  expect(current.pendientes).toBe(0);
  expect(current.notificaciones).toEqual([]);
  expect(suscribirNotificaciones).toHaveBeenCalledTimes(2);
  emit([status('late-owner', false)], 0);
  expect(current.notificaciones).toEqual([]);
  emit([status('other-state', false, 'other')], 1);
  expect(current.pendientes).toBe(1);
  act(() => tree.unmount());
  expect(stops[1]).toHaveBeenCalledTimes(1);
});

test('sin sesión no conserva avisos ni crea listeners', () => {
  const tree = mount(null);
  expect(current.pendientes).toBe(0);
  expect(current.notificaciones).toEqual([]);
  expect(suscribirNotificaciones).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

test('dos pulsaciones simultáneas marcan el mismo aviso una sola vez', async () => {
  let finish;
  marcarNotificacionLeida.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const tree = mount();
  emit([status('a', false)]);
  let first;
  let second;
  act(() => {
    first = current.marcarLeida('a');
    second = current.marcarLeida('a');
  });
  expect(marcarNotificacionLeida).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await Promise.all([first, second]); });
  expect(current.pendientes).toBe(0);
  act(() => tree.unmount());
});

test('un marcado antiguo no libera la protección del nuevo usuario con el mismo ID', async () => {
  let finishOld;
  let finishNew;
  marcarNotificacionLeida
    .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
    .mockReturnValueOnce(new Promise((resolve) => { finishNew = resolve; }));
  const tree = mount();
  emit([status('shared', false)]);
  let oldOperation;
  act(() => { oldOperation = current.marcarLeida('shared'); });
  act(() => tree.update(<Probe uid="other" />));
  emit([status('shared', false, 'other')]);
  let newOperation;
  act(() => { newOperation = current.marcarLeida('shared'); });
  await act(async () => { finishOld(); await oldOperation; });
  expect(current.pendientes).toBe(1);
  act(() => { current.marcarLeida('shared'); });
  expect(marcarNotificacionLeida).toHaveBeenCalledTimes(2);
  await act(async () => { finishNew(); await newOperation; });
  expect(current.pendientes).toBe(0);
  act(() => tree.unmount());
});
