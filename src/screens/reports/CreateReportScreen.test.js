import React from 'react';
import { act, create } from 'react-test-renderer';
import { TextInput, TouchableOpacity, View } from 'react-native';

jest.mock('../../services/location.service', () => ({ obtenerUbicacionActual: jest.fn() }));
jest.mock('../../services/reports.service', () => ({ crearReporte: jest.fn() }));
jest.mock('../../services/photo.service', () => ({ subirFoto: jest.fn() }));

const { obtenerUbicacionActual } = require('../../services/location.service');
const { crearReporte } = require('../../services/reports.service');
const user = { uid: 'ciudadano-1' };

global.IS_REACT_ACT_ENVIRONMENT = true;

function renderScreen() {
  const Screen = require('./CreateReportScreen').default;
  const onCreated = jest.fn();
  let tree;
  act(() => { tree = create(<Screen user={user} onCreated={onCreated} />); });
  return { tree, onCreated };
}

function button(tree, label) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === label);
}

function description(tree) {
  return tree.root.findAllByType(TextInput)
    .find((node) => node.props.accessibilityLabel === 'Descripción');
}

async function fillValidForm(tree) {
  act(() => {
    button(tree, 'Alumbrado').props.onPress();
    description(tree).props.onChangeText('Luminaria apagada');
  });
  await act(async () => { await button(tree, 'Obtener ubicación').props.onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  obtenerUbicacionActual.mockResolvedValue({ latitude: 9.3047, longitude: -75.3978 });
  crearReporte.mockResolvedValue('reporte-1');
});

test('muestra el selector de tipo, descripción, GPS y envío', () => {
  const { tree } = renderScreen();
  expect(button(tree, 'Alumbrado')).toBeTruthy();
  expect(description(tree)).toBeTruthy();
  expect(button(tree, 'Obtener ubicación')).toBeTruthy();
  expect(button(tree, 'Crear reporte')).toBeTruthy();
  act(() => { tree.unmount(); });
});

test('impide enviar sin tipo y comunica el error', async () => {
  const { tree } = renderScreen();
  act(() => { description(tree).props.onChangeText('Luminaria apagada'); });
  await act(async () => { await button(tree, 'Obtener ubicación').props.onPress(); });
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(View).filter((node) => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});

test('impide enviar con descripción vacía o espacios y comunica el error', async () => {
  const { tree } = renderScreen();
  act(() => {
    button(tree, 'Alumbrado').props.onPress();
    description(tree).props.onChangeText('   ');
  });
  await act(async () => { await button(tree, 'Obtener ubicación').props.onPress(); });
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(View).filter((node) => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});

test('un formulario válido crea un reporte sin fotografía', async () => {
  const { tree, onCreated } = renderScreen();
  await fillValidForm(tree);
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).toHaveBeenCalledWith(expect.objectContaining({
    tipo: expect.any(String), descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
  }));
  expect(crearReporte.mock.calls[0][0].fotoUrl).toBeFalsy();
  expect(onCreated).toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

test('impide dos envíos mientras Firestore sigue procesando el primero', async () => {
  let finish;
  crearReporte.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const { tree } = renderScreen();
  await fillValidForm(tree);
  act(() => { button(tree, 'Crear reporte').props.onPress(); });
  act(() => { button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).toHaveBeenCalledTimes(1);
  await act(async () => { finish('reporte-1'); });
  act(() => { tree.unmount(); });
});

test('informa el error de creación sin anunciar éxito', async () => {
  crearReporte.mockRejectedValue(new Error('Firestore no disponible'));
  const { tree, onCreated } = renderScreen();
  await fillValidForm(tree);
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(onCreated).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(View).filter((node) => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});

test('impide el envío si no se ha obtenido una ubicación válida', async () => {
  const { tree } = renderScreen();
  act(() => {
    button(tree, 'Alumbrado').props.onPress();
    description(tree).props.onChangeText('Luminaria apagada');
  });
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});
