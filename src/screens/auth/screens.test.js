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

function pressButton(tree, label) {
  return tree.root.findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === label).props.onPress();
}

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
