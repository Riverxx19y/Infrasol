import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

jest.mock('../../services/auth.service', () => ({
  iniciarSesion: jest.fn(),
  solicitarRecuperacion: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const MENSAJE_GENERICO = /si el correo está registrado/i;

beforeEach(() => jest.clearAllMocks());

afterEach(() => jest.useRealTimers());

function render(props = {}) {
  const RecoverPasswordScreen = require('./RecoverPasswordScreen').default;
  let tree;
  act(() => { tree = create(<RecoverPasswordScreen onBack={jest.fn()} {...props} />); });
  return tree;
}

function button(tree, label) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((item) => item.props.accessibilityLabel === label);
}

function typeEmail(tree, value) {
  act(() => {
    tree.root.findAllByType(TextInput)
      .find((input) => input.props.accessibilityLabel === 'Correo electrónico')
      .props.onChangeText(value);
  });
}

function textOf(node) {
  return node.findAllByType(Text)
    .flatMap((text) => [].concat(text.props.children))
    .filter((child) => typeof child === 'string')
    .join(' ');
}

function alerts(tree) {
  return tree.root.findAllByType(View).filter((view) => view.props.accessibilityRole === 'alert');
}

test('HU-11: muestra el formulario con correo, envío y regreso al inicio de sesión', () => {
  const tree = render();
  expect(tree.root.findAllByType(TextInput)
    .filter((input) => input.props.accessibilityLabel === 'Correo electrónico')).toHaveLength(1);
  expect(button(tree, 'Enviar enlace')).toBeDefined();
  expect(button(tree, 'Volver a iniciar sesión')).toBeDefined();
  expect(alerts(tree)).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test('HU-11: con un correo válido solicita el enlace y confirma con un mensaje genérico', async () => {
  const { solicitarRecuperacion } = require('../../services/auth.service');
  solicitarRecuperacion.mockResolvedValue(undefined);
  const tree = render();

  typeEmail(tree, '  ana@example.test ');
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });

  expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
  expect(solicitarRecuperacion).toHaveBeenCalledWith('ana@example.test');
  expect(textOf(tree.root)).toMatch(MENSAJE_GENERICO);
  expect(textOf(tree.root)).not.toMatch(/no existe|no está registrad|no encontrad/i);
  expect(alerts(tree)).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test.each([
  ['vacío', '   ', /ingresa tu correo electrónico/i],
  ['inválido', 'ana@example', /correo electrónico válido/i],
])('HU-11: un correo %s muestra error y no llama al servicio', async (description, value, message) => {
  const { solicitarRecuperacion } = require('../../services/auth.service');
  const tree = render();

  typeEmail(tree, value);
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });

  expect(solicitarRecuperacion).not.toHaveBeenCalled();
  expect(alerts(tree)).toHaveLength(1);
  expect(textOf(alerts(tree)[0])).toMatch(message);
  expect(textOf(tree.root)).not.toMatch(MENSAJE_GENERICO);
  act(() => { tree.unmount(); });
});

test.each([
  ['auth/network-request-failed', /conexión/i],
  ['auth/too-many-requests', /demasiad/i],
])('HU-11: el error %s se informa sin confirmar el envío', async (code, message) => {
  const { solicitarRecuperacion } = require('../../services/auth.service');
  solicitarRecuperacion.mockRejectedValue(Object.assign(new Error(`Firebase: Error (${code}).`), { code }));
  const tree = render();

  typeEmail(tree, 'ana@example.test');
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });

  expect(alerts(tree)).toHaveLength(1);
  expect(textOf(alerts(tree)[0])).toMatch(message);
  expect(textOf(alerts(tree)[0])).not.toMatch(/firebase|auth\//i);
  expect(textOf(tree.root)).not.toMatch(MENSAJE_GENERICO);
  act(() => { tree.unmount(); });
});

test('HU-11: un error desconocido muestra un mensaje genérico sin detalles técnicos', async () => {
  const { solicitarRecuperacion } = require('../../services/auth.service');
  solicitarRecuperacion.mockRejectedValue(
    Object.assign(new Error('Firebase: Error (auth/internal-error).'), { code: 'auth/internal-error' }),
  );
  const tree = render();

  typeEmail(tree, 'ana@example.test');
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });

  expect(alerts(tree)).toHaveLength(1);
  expect(textOf(alerts(tree)[0])).toMatch(/intenta de nuevo/i);
  expect(textOf(alerts(tree)[0])).not.toMatch(/firebase|auth\/|internal/i);
  act(() => { tree.unmount(); });
});

test('HU-11: pulsaciones repetidas mientras carga generan una sola solicitud', async () => {
  const { solicitarRecuperacion } = require('../../services/auth.service');
  let resolve;
  solicitarRecuperacion.mockReturnValue(new Promise((done) => { resolve = done; }));
  const tree = render();

  typeEmail(tree, 'ana@example.test');
  let first;
  act(() => { first = button(tree, 'Enviar enlace').props.onPress(); });
  expect(button(tree, 'Enviar enlace').props.disabled).toBe(true);
  act(() => { button(tree, 'Enviar enlace').props.onPress(); });

  await act(async () => { resolve(); await first; });
  expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

test('HU-11: tras un envío exige 60 segundos antes de permitir otra solicitud', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  const { solicitarRecuperacion } = require('../../services/auth.service');
  solicitarRecuperacion.mockResolvedValue(undefined);
  const tree = render();

  typeEmail(tree, 'ana@example.test');
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });
  expect(button(tree, 'Enviar enlace').props.disabled).toBe(true);
  await act(async () => { await button(tree, 'Enviar enlace').props.onPress(); });
  expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);

  act(() => { jest.advanceTimersByTime(60_000); });
  expect(button(tree, 'Enviar enlace').props.disabled).toBe(false);
  act(() => { tree.unmount(); });
});

test('HU-11: Volver a iniciar sesión ejecuta onBack', () => {
  const onBack = jest.fn();
  const tree = render({ onBack });
  act(() => { button(tree, 'Volver a iniciar sesión').props.onPress(); });
  expect(onBack).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});
