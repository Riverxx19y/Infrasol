import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import RegisterScreen from './RegisterScreen';
import VerificationScreen from './VerificationScreen';
import { registrarCiudadano, reenviarCodigo, verificarCodigo } from '../../services/registration.service';

jest.mock('../../services/registration.service', () => ({
  registrarCiudadano: jest.fn(),
  reenviarCodigo: jest.fn(),
  verificarCodigo: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => jest.clearAllMocks());

function pressButton(tree, label) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === label).props.onPress();
}

test('el registro envía los datos al servicio y comunica la cuenta creada', async () => {
  const user = { uid: 'u1', email: 'persona@example.test' };
  const gateway = { solicitarCodigo: jest.fn() };
  const onRegistered = jest.fn();
  registrarCiudadano.mockResolvedValue(user);
  let tree;
  act(() => { tree = create(<RegisterScreen otpGateway={gateway} onRegistered={onRegistered} />); });

  act(() => {
    const inputs = tree.root.findAllByType(TextInput);
    inputs.find((input) => input.props.accessibilityLabel === 'Nombre completo').props.onChangeText('Ana Pérez');
    inputs.find((input) => input.props.accessibilityLabel === 'Correo electrónico').props.onChangeText(user.email);
    inputs.find((input) => input.props.accessibilityLabel === 'Contraseña').props.onChangeText('seis-digitos');
  });
  await act(async () => { await pressButton(tree, 'Crear cuenta'); });

  expect(registrarCiudadano).toHaveBeenCalledWith(
    { nombre: 'Ana Pérez', email: user.email, password: 'seis-digitos' }, gateway,
  );
  expect(onRegistered).toHaveBeenCalledWith(user);
  act(() => { tree.unmount(); });
});

test('la verificación envía los seis dígitos al servicio sin presentar error', async () => {
  const gateway = { verificarCodigo: jest.fn() };
  verificarCodigo.mockResolvedValue({ verificado: true });
  let tree;
  act(() => { tree = create(<VerificationScreen user={{ uid: 'u1', email: 'persona@example.test' }} otpGateway={gateway} />); });

  act(() => {
    for (const [index, input] of tree.root.findAllByType(TextInput).entries()) {
      input.props.onChangeText(String(index + 1));
    }
  });
  await act(async () => { await pressButton(tree, 'Verificar código'); });

  expect(verificarCodigo).toHaveBeenCalledWith('u1', '123456', gateway);
  expect(tree.root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
  act(() => { tree.unmount(); });
});

test('el formulario presenta el error del servicio y no avanza a verificación', async () => {
  registrarCiudadano.mockRejectedValue(new Error('El servicio de verificación de correo aún no está configurado.'));
  const onRegistered = jest.fn();
  let tree;
  act(() => { tree = create(<RegisterScreen onRegistered={onRegistered} />); });

  await act(async () => { await pressButton(tree, 'Crear cuenta'); });

  expect(registrarCiudadano).toHaveBeenCalledTimes(1);
  expect(onRegistered).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && text.props.children.includes('aún no está configurado'))).toBe(true);
});

test('la verificación muestra integración pendiente y conserva seis casillas', async () => {
  verificarCodigo.mockRejectedValue(new Error('El servicio de verificación de correo aún no está configurado.'));
  reenviarCodigo.mockRejectedValue(new Error('El servicio de verificación de correo aún no está configurado.'));
  let tree;
  act(() => { tree = create(<VerificationScreen user={{ uid: 'u1', email: 'persona@example.test' }} />); });

  expect(tree.root.findAllByType(TextInput)).toHaveLength(6);
  expect(tree.root.findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && text.props.children.includes('pendiente de configuración'))).toBe(true);
  await act(async () => { await pressButton(tree, 'Reenviar código'); });
  expect(reenviarCodigo).toHaveBeenCalledWith('u1', undefined);
  expect(tree.root.findAllByType(Text).some((text) =>
    typeof text.props.children === 'string' && text.props.children.includes('aún no está configurado'))).toBe(true);
});

test('el reenvío mantiene 60 segundos de espera y vuelve a habilitarse', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  reenviarCodigo.mockResolvedValue({ enviado: true });
  let tree;
  act(() => { tree = create(<VerificationScreen user={{ uid: 'u1', email: 'persona@example.test' }} otpGateway={{ reenviarCodigo: jest.fn() }} />); });

  await act(async () => { await pressButton(tree, 'Reenviar código'); });
  const resendButton = () => tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === 'Reenviar código');
  expect(resendButton().props.disabled).toBe(true);
  act(() => { jest.advanceTimersByTime(60_000); });
  expect(resendButton().props.disabled).toBe(false);

  act(() => { tree.unmount(); });
  jest.useRealTimers();
});
