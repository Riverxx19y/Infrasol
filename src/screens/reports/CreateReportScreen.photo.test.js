import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}), { virtual: true });
jest.mock('../../services/location.service', () => ({ obtenerUbicacionActual: jest.fn() }));
jest.mock('../../services/reports.service', () => ({ crearReporte: jest.fn() }));
jest.mock('../../services/photo.service', () => ({ subirFoto: jest.fn() }), { virtual: true });

const Picker = require('expo-image-picker');
const { obtenerUbicacionActual } = require('../../services/location.service');
const { crearReporte } = require('../../services/reports.service');
const { subirFoto } = require('../../services/photo.service');

global.IS_REACT_ACT_ENVIRONMENT = true;

function button(tree, label) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((node) => node.props.accessibilityLabel === label);
}

function renderScreen() {
  const Screen = require('./CreateReportScreen').default;
  const onCreated = jest.fn();
  let tree;
  act(() => { tree = create(<Screen user={{ uid: 'ciudadano-1' }} onCreated={onCreated} />); });
  return { tree, onCreated };
}

async function fillRequiredFields(tree) {
  act(() => {
    button(tree, 'Alumbrado').props.onPress();
    tree.root.findAllByType(TextInput)
      .find((node) => node.props.accessibilityLabel === 'Descripción')
      .props.onChangeText('Luminaria apagada');
  });
  await act(async () => { await button(tree, 'Obtener ubicación').props.onPress(); });
}

async function chooseSource(tree, source) {
  const addPhoto = button(tree, 'Agregar foto');
  expect(addPhoto).toBeDefined();
  act(() => { addPhoto.props.onPress(); });
  const actions = Alert.alert.mock.calls.at(-1)?.[2];
  const choice = actions?.find((action) => action.text === source);
  expect(choice).toBeDefined();
  await act(async () => { await choice.onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  obtenerUbicacionActual.mockResolvedValue({ latitude: 9.3047, longitude: -75.3978, direccion: 'Calle 1' });
  crearReporte.mockResolvedValue('reporte-1');
  subirFoto.mockResolvedValue('https://i.ibb.co/reporte.jpg');
  Picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://camara.jpg', base64: 'BASE64_CAMARA' }] });
  Picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://galeria.jpg', base64: 'BASE64_GALERIA' }] });
});

afterEach(() => jest.restoreAllMocks());

test('HU-03 RED 2: solicita permiso y selecciona una imagen de galería', async () => {
  const { tree } = renderScreen();
  await chooseSource(tree, 'Galería');
  expect(Picker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(Picker.requestMediaLibraryPermissionsAsync.mock.invocationCallOrder[0])
    .toBeLessThan(Picker.launchImageLibraryAsync.mock.invocationCallOrder[0]);
  expect(tree.root.findAllByType(Image).some((image) => image.props.source?.uri === 'file://galeria.jpg')).toBe(true);
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: solicita permiso y captura una imagen con cámara', async () => {
  const { tree } = renderScreen();
  await chooseSource(tree, 'Cámara');
  expect(Picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Picker.launchCameraAsync).toHaveBeenCalledTimes(1);
  expect(Picker.requestCameraPermissionsAsync.mock.invocationCallOrder[0])
    .toBeLessThan(Picker.launchCameraAsync.mock.invocationCallOrder[0]);
  expect(tree.root.findAllByType(Image).some((image) => image.props.source?.uri === 'file://camara.jpg')).toBe(true);
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: cancelar la selección permite crear el reporte sin fotografía', async () => {
  Picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
  const { tree } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(subirFoto).not.toHaveBeenCalled();
  expect(crearReporte).toHaveBeenCalledWith(expect.objectContaining({
    tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
  }));
  expect(crearReporte.mock.calls[0][0].fotoUrl).toBeFalsy();
  act(() => { tree.unmount(); });
});

test.each([
  ['Cámara', 'requestCameraPermissionsAsync', 'launchCameraAsync'],
  ['Galería', 'requestMediaLibraryPermissionsAsync', 'launchImageLibraryAsync'],
])('HU-03 RED 2: permiso denegado en %s muestra aviso sin abrir el selector', async (source, request, launch) => {
  Picker[request].mockResolvedValue({ status: 'denied' });
  const { tree } = renderScreen();
  await chooseSource(tree, source);
  expect(Picker[launch]).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && /permiso/i.test(text.props.children)
  )).toBe(true);
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: error al seleccionar conserva la descripción y no envía una imagen inválida', async () => {
  Picker.launchImageLibraryAsync.mockRejectedValue(new Error('Galería no disponible'));
  const { tree } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  expect(tree.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Descripción').props.value)
    .toBe('Luminaria apagada');
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(subirFoto).not.toHaveBeenCalled();
  expect(crearReporte.mock.calls[0][0].fotoUrl).toBeFalsy();
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: una foto subida queda asociada al reporte con sus campos obligatorios', async () => {
  const { tree, onCreated } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(subirFoto).toHaveBeenCalledWith('BASE64_GALERIA');
  expect(crearReporte).toHaveBeenCalledWith(expect.objectContaining({
    tipo: 'Alumbrado', descripcion: 'Luminaria apagada', lat: 9.3047, lng: -75.3978,
    direccion: 'Calle 1', fotoUrl: 'https://i.ibb.co/reporte.jpg',
  }));
  expect(onCreated).toHaveBeenCalledWith('reporte-1');
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: tras fallar la subida avisa y permite enviar una sola vez sin foto', async () => {
  subirFoto.mockRejectedValue(new Error('Servidor de imágenes no disponible'));
  const { tree, onCreated } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  expect(crearReporte).not.toHaveBeenCalled();
  const warning = Alert.alert.mock.calls.find(([title]) => /subir foto/i.test(title));
  expect(warning).toBeDefined();
  const continueWithoutPhoto = warning[2].find((action) => action.text === 'Enviar sin foto');
  expect(continueWithoutPhoto).toBeDefined();
  expect(tree.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Descripción').props.value)
    .toBe('Luminaria apagada');
  await act(async () => { await continueWithoutPhoto.onPress(); });
  expect(crearReporte).toHaveBeenCalledTimes(1);
  expect(crearReporte.mock.calls[0][0].fotoUrl).toBeFalsy();
  expect(onCreated).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

test('HU-03: una foto demasiado grande indica que se seleccione una más pequeña', async () => {
  subirFoto.mockRejectedValue(new Error('La fotografía es demasiado grande. Selecciona una más pequeña.'));
  const { tree } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  await act(async () => { await button(tree, 'Crear reporte').props.onPress(); });
  const warning = Alert.alert.mock.calls.find(([title]) => /subir foto/i.test(title));
  expect(warning?.[1]).toMatch(/más pequeña/i);
  expect(crearReporte).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

test('HU-03 RED 2: evita envíos duplicados mientras se sube la fotografía', async () => {
  let finishUpload;
  subirFoto.mockReturnValue(new Promise((resolve) => { finishUpload = resolve; }));
  const { tree } = renderScreen();
  await fillRequiredFields(tree);
  await chooseSource(tree, 'Galería');
  act(() => { button(tree, 'Crear reporte').props.onPress(); });
  act(() => { button(tree, 'Crear reporte').props.onPress(); });
  expect(subirFoto).toHaveBeenCalledTimes(1);
  expect(crearReporte).not.toHaveBeenCalled();
  await act(async () => { finishUpload('https://i.ibb.co/reporte.jpg'); });
  expect(crearReporte).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});
